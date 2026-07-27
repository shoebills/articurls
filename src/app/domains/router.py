from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import json
import logging
from datetime import datetime, timezone
from typing import List

from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..config import settings
from ..redis_client import redis_client
from .schemas import DomainIn, DomainOut, DomainVerifyOut, DomainLookupOut, DomainAddResponse, DNSRecord
from .activation import (
    apply_domain_verification,
    build_dns_instructions,
    is_vercel_verified,
    vercel_sync_required,
)
from ..vercel.client import VercelClient, VercelError
from .utils import normalize_hostname, validate_hostname

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Domain"])


def _invalidate_domain_cache(hostname: str) -> None:
    try:
        redis_client.delete(f"domain_lookup:{hostname}")
    except Exception:
        pass


async def _register_vercel_domain(hostname: str) -> None:
    if not vercel_sync_required():
        return
    vc = VercelClient()
    try:
        await vc.add_project_domain(hostname)
    except VercelError as exc:
        logger.warning("Vercel add domain failed for %s: %s", hostname, exc.body)


async def _remove_vercel_domain(hostname: str) -> None:
    if not vercel_sync_required():
        return
    vc = VercelClient()
    await vc.remove_project_domain(hostname)


def _cached_dns(db_user: models.User) -> List[DNSRecord] | None:
    if not db_user.domain_dns_instructions:
        return None
    try:
        return [DNSRecord(**r) for r in db_user.domain_dns_instructions]
    except Exception:
        return None


async def _load_dns_instructions(db_user: models.User) -> List[DNSRecord] | None:
    if not db_user.custom_domain:
        return None

    needs_vercel = vercel_sync_required() and not is_vercel_verified(db_user.custom_domain)
    if db_user.domain_status != models.DomainStatus.PENDING and not needs_vercel:
        return None

    vc = VercelClient()
    vercel_domain = vc.get_project_domain_sync(db_user.custom_domain) if vc.configured else None
    instructions = build_dns_instructions(db_user.custom_domain, vercel_domain)
    if instructions:
        db_user.domain_dns_instructions = [r.model_dump() for r in instructions]
    return instructions or None


@router.post("/settings/domain", response_model=DomainAddResponse, status_code=status.HTTP_200_OK)
async def add_domain(
    body: DomainIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    hostname = normalize_hostname(body.hostname)
    validate_hostname(hostname)

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(models.User).filter(
        models.User.custom_domain == hostname,
        models.User.user_id != current_user.user_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    await _register_vercel_domain(hostname)

    vc = VercelClient()
    vercel_domain = vc.get_project_domain_sync(hostname) if vc.configured else None
    dns_instructions = build_dns_instructions(hostname, vercel_domain)

    db_user.custom_domain = hostname
    db_user.domain_status = models.DomainStatus.PENDING
    db_user.domain_dns_instructions = [r.model_dump() for r in dns_instructions]
    db_user.is_domain_verified = False
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        await _remove_vercel_domain(hostname)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    _invalidate_domain_cache(hostname)

    return DomainAddResponse(
        hostname=hostname,
        domain_status=models.DomainStatus.PENDING,
        dns_instructions=dns_instructions,
    )


@router.get("/settings/domain", response_model=DomainOut, response_model_by_alias=False, status_code=status.HTTP_200_OK)
async def get_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    dns_instructions = await _load_dns_instructions(db_user)
    if dns_instructions is None:
        dns_instructions = _cached_dns(db_user) if db_user.domain_status == models.DomainStatus.PENDING else None

    if dns_instructions is not None:
        db.commit()

    return DomainOut(
        custom_domain=db_user.custom_domain,
        domain_status=db_user.domain_status,
        verified_at=db_user.verified_at,
        grace_started_at=db_user.grace_started_at,
        grace_expires_at=db_user.grace_expires_at,
        dns_instructions=dns_instructions,
    )


@router.post("/settings/domain/verify", response_model=DomainVerifyOut, status_code=status.HTTP_200_OK)
async def verify_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not db_user.custom_domain:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No custom domain configured.")

    if db_user.domain_status == models.DomainStatus.ACTIVE:
        if not vercel_sync_required() or is_vercel_verified(db_user.custom_domain):
            return DomainVerifyOut(
                verification_status="already_verified",
                domain_status=db_user.domain_status,
                dns_instructions=None,
                message=None,
            )

    if db_user.updated_at:
        time_since_update = (datetime.now(timezone.utc) - db_user.updated_at).total_seconds()
        if time_since_update < 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait a few seconds before verifying again.",
            )

    vc = VercelClient()
    vercel_domain = vc.get_project_domain_sync(db_user.custom_domain) if vc.configured else None

    cached = _cached_dns(db_user)
    result = apply_domain_verification(db_user, vercel_domain, cached)
    db.commit()
    return result


@router.delete("/settings/domain", status_code=status.HTTP_200_OK)
async def delete_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if old_domain := db_user.custom_domain:
        await _remove_vercel_domain(old_domain)

    db_user.custom_domain = None
    db_user.domain_status = models.DomainStatus.NONE
    db_user.is_domain_verified = False
    db_user.domain_dns_instructions = None
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    db.commit()
    if old_domain:
        _invalidate_domain_cache(old_domain)
    return {"message": "Custom domain removed."}


_DOMAIN_CACHE_TTL = 300


@router.get("/internal/domain-lookup", response_model=DomainLookupOut, status_code=status.HTTP_200_OK)
def domain_lookup(hostname: str, request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    normalized = normalize_hostname(hostname)
    cache_key = f"domain_lookup:{normalized}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    db_user = db.query(models.User).filter(models.User.custom_domain == normalized).first()
    if not db_user:
        ugc_domain = settings.ugc_domain
        if ugc_domain and normalized.endswith(f".{ugc_domain}"):
            subdomain = normalized[: -len(f".{ugc_domain}")]
            RESERVED_SUBDOMAINS = {"www", "app", "api", "admin", "mail", "support"}
            if subdomain and subdomain not in RESERVED_SUBDOMAINS:
                db_user = db.query(models.User).filter(models.User.user_name == subdomain).first()
                if db_user:
                    result = {"username": db_user.user_name, "domain_status": "active"}
                    try:
                        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
                    except Exception:
                        pass
                    return result
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    if db_user.domain_status not in (
        models.DomainStatus.ACTIVE,
        models.DomainStatus.GRACE,
        models.DomainStatus.EXPIRED,
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    result = {
        "username": db_user.user_name,
        "domain_status": db_user.domain_status.value if hasattr(db_user.domain_status, "value") else db_user.domain_status,
    }

    try:
        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
    except Exception:
        pass

    return result


@router.get("/internal/sitemap-users", status_code=status.HTTP_200_OK)
def sitemap_users(request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    rows = (
        db.query(models.User)
        .filter(~models.User.domain_status.in_((models.DomainStatus.ACTIVE, models.DomainStatus.GRACE)))
        .order_by(models.User.user_name.asc().nulls_last())
        .all()
    )

    return [
        {"username": u.user_name, "updated_at": u.updated_at.isoformat() if u.updated_at else None}
        for u in rows
    ]


@router.get("/internal/user-seo-eligibility", status_code=status.HTTP_200_OK)
def user_seo_eligibility(username: str, request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    db_user = db.query(models.User).filter(models.User.user_name == username).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    has_active_custom_domain = db_user.domain_status in (models.DomainStatus.ACTIVE, models.DomainStatus.GRACE)
    return {"can_index_on_ugc": bool(not has_active_custom_domain)}
