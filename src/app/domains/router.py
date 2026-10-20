from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import json
import logging
from typing import Any, Dict, List, Optional

from ..database import get_db
from .. import models
from ..utils import is_pro_entitled
from ..security.oauth2 import get_current_user
from ..security.oauth2 import get_current_site
from ..config import settings
from ..redis_client import redis_client
from ..cache.service import purge_domain_lookup_tags
from .schemas import DomainIn, DomainOut, DomainVerifyOut, DomainLookupOut, DomainAddResponse, DNSRecord
from .activation import (
    apply_domain_verification,
    build_dns_instructions,
    is_vercel_verified,
    vercel_sync_required,
)
from ..vercel.client import VercelClient, VercelError
from ..utils.rate_limit import check_rate_limit_user
from .utils import invalidate_domain_lookup_cache, normalize_hostname, reset_domain_columns, validate_hostname

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Domain"])

_DOMAIN_WRITE_LIMIT = 10
_DOMAIN_WRITE_WINDOW = 3600
_DOMAIN_WRITE_BURST = 5

_DOMAIN_READ_LIMIT = 30
_DOMAIN_READ_WINDOW = 60
_DOMAIN_READ_BURST = 10

_DOMAIN_VERIFY_LIMIT = 10
_DOMAIN_VERIFY_WINDOW = 60
_DOMAIN_VERIFY_BURST = 2


def _canonical_url_for_subdomain(
    db_site: models.Site, requested_hostname: str
) -> Optional[str]:
    if db_site.custom_domain and db_site.domain_status in (
        models.DomainStatus.ACTIVE,
        models.DomainStatus.GRACE,
    ):
        return f"https://{db_site.custom_domain}"
    ugc_domain = settings.ugc_domain
    expected = f"{db_site.subdomain}.{ugc_domain}"
    if requested_hostname != expected:
        return f"https://{expected}"
    return None


async def _register_vercel_domain(hostname: str) -> Optional[Dict[str, Any]]:
    if not vercel_sync_required():
        return None
    vc = VercelClient()
    try:
        return await vc.add_project_domain(hostname)
    except VercelError as exc:
        logger.warning("Vercel add domain failed for %s: %s", hostname, exc.body)
        return None


async def _remove_vercel_domain(hostname: str) -> None:
    if not vercel_sync_required():
        return
    vc = VercelClient()
    await vc.remove_project_domain(hostname)


def _cached_dns(db_site: models.Site) -> List[DNSRecord] | None:
    if not db_site.domain_dns_instructions:
        return None
    try:
        return [DNSRecord(**r) for r in db_site.domain_dns_instructions]
    except Exception:
        return None


async def _load_dns_instructions(db_site: models.Site) -> List[DNSRecord] | None:
    if not db_site.custom_domain:
        return None

    vc = VercelClient()
    vercel_domain = vc.get_project_domain_sync(db_site.custom_domain) if vc.configured else None

    vercel_unverified = vercel_sync_required() and not (vercel_domain and vercel_domain.get("verified"))
    if db_site.domain_status != models.DomainStatus.PENDING and not vercel_unverified:
        return None

    return build_dns_instructions(db_site.custom_domain, vercel_domain) or None


@router.post("/settings/domain", response_model=DomainAddResponse, status_code=status.HTTP_200_OK)
async def add_domain(
    body: DomainIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-write",
        current_user.user_id,
        _DOMAIN_WRITE_LIMIT,
        _DOMAIN_WRITE_WINDOW,
        burst=_DOMAIN_WRITE_BURST,
    )
    if not is_pro_entitled(current_site.user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom domains require an active Pro subscription.",
        )

    hostname = normalize_hostname(body.hostname)
    validate_hostname(hostname)

    db_site = current_site
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(models.Site).filter(models.Site.custom_domain == hostname, models.Site.site_id != current_site.site_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    vercel_domain = await _register_vercel_domain(hostname)
    if not vercel_domain:
        vc = VercelClient()
        vercel_domain = vc.get_project_domain_sync(hostname) if vc.configured else None
    dns_instructions = build_dns_instructions(hostname, vercel_domain)

    old_domain = db_site.custom_domain
    if old_domain and old_domain != hostname:
        await _remove_vercel_domain(old_domain)

    db_site.custom_domain = hostname
    db_site.custom_subpath = None
    db_site.domain_status = models.DomainStatus.PENDING
    db_site.domain_dns_instructions = [r.model_dump() for r in dns_instructions]
    db_site.verified_at = None
    db_site.grace_started_at = None
    db_site.grace_expires_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        await _remove_vercel_domain(hostname)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    hosts = invalidate_domain_lookup_cache(hostname, db_site.subdomain)
    if old_domain and old_domain != hostname:
        hosts.extend(invalidate_domain_lookup_cache(old_domain, None))
    if hosts:
        background_tasks.add_task(purge_domain_lookup_tags, hosts)

    return DomainAddResponse(
        hostname=hostname,
        domain_status=models.DomainStatus.PENDING,
        dns_instructions=dns_instructions,
    )


@router.get("/settings/domain", response_model=DomainOut, response_model_by_alias=False, status_code=status.HTTP_200_OK)
async def get_domain(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-read",
        current_user.user_id,
        _DOMAIN_READ_LIMIT,
        _DOMAIN_READ_WINDOW,
        burst=_DOMAIN_READ_BURST,
    )
    db_site = current_site
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    dns_instructions = await _load_dns_instructions(db_site)
    if dns_instructions is None:
        dns_instructions = _cached_dns(db_site) if db_site.domain_status == models.DomainStatus.PENDING else None

    return DomainOut(
        custom_domain=db_site.custom_domain,
        domain_status=db_site.domain_status,
        verified_at=db_site.verified_at,
        grace_started_at=db_site.grace_started_at,
        grace_expires_at=db_site.grace_expires_at,
        dns_instructions=dns_instructions,
    )


@router.post("/settings/domain/verify", response_model=DomainVerifyOut, status_code=status.HTTP_200_OK)
async def verify_domain(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-verify",
        current_user.user_id,
        _DOMAIN_VERIFY_LIMIT,
        _DOMAIN_VERIFY_WINDOW,
        burst=_DOMAIN_VERIFY_BURST,
    )
    if not is_pro_entitled(current_site.user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom domains require an active Pro subscription.",
        )

    db_site = current_site
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not db_site.custom_domain:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No custom domain configured.")

    if db_site.domain_status == models.DomainStatus.ACTIVE:
        if not vercel_sync_required() or is_vercel_verified(db_site.custom_domain):
            return DomainVerifyOut(
                verification_status="already_verified",
                domain_status=db_site.domain_status,
                dns_instructions=None,
                message=None,
            )

    verify_key = f"verify_domain:{db_site.site_id}"
    try:
        if redis_client.get(verify_key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait a few seconds before verifying again.",
            )
        redis_client.setex(verify_key, 3, "1")
    except HTTPException:
        raise
    except Exception:
        pass

    vc = VercelClient()
    vercel_domain = vc.get_project_domain_sync(db_site.custom_domain) if vc.configured else None

    cached = _cached_dns(db_site)
    result = apply_domain_verification(db_site, vercel_domain, cached)
    db.commit()

    if result.domain_status == models.DomainStatus.ACTIVE:
        hosts = invalidate_domain_lookup_cache(db_site.custom_domain, db_site.subdomain)
        if hosts:
            background_tasks.add_task(purge_domain_lookup_tags, hosts)

    return result


@router.delete("/settings/domain", status_code=status.HTTP_200_OK)
async def delete_domain(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-write",
        current_user.user_id,
        _DOMAIN_WRITE_LIMIT,
        _DOMAIN_WRITE_WINDOW,
        burst=_DOMAIN_WRITE_BURST,
    )
    db_site = current_site
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if old_domain := db_site.custom_domain:
        await _remove_vercel_domain(old_domain)

    reset_domain_columns(db_site)
    db.commit()
    hosts = invalidate_domain_lookup_cache(old_domain, db_site.subdomain)
    if hosts:
        background_tasks.add_task(purge_domain_lookup_tags, hosts)

    from ..umami.service import enqueue_umami_domain_sync

    enqueue_umami_domain_sync(db_site.user_id)

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

    db_site = db.query(models.Site).filter(models.Site.custom_domain == normalized).first()
    if not db_site:
        ugc_domain = settings.ugc_domain
        if ugc_domain and normalized.endswith(f".{ugc_domain}"):
            subdomain = normalized[: -len(f".{ugc_domain}")]
            RESERVED_SUBDOMAINS = {"www", "app", "api", "admin", "mail", "support", "analytics", "vitals"}
            if subdomain and subdomain not in RESERVED_SUBDOMAINS:
                db_site = db.query(models.Site).filter(models.Site.subdomain == subdomain).first()
                if db_site:
                    result = {
                        "subdomain": db_site.subdomain,
                        "domain_status": "active",
                        "redirect_to": _canonical_url_for_subdomain(db_site, normalized),
                        "custom_subpath": db_site.custom_subpath,
                    }
                    try:
                        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
                    except Exception:
                        pass
                    return result
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    if db_site.domain_status not in (
        models.DomainStatus.PENDING,
        models.DomainStatus.ACTIVE,
        models.DomainStatus.GRACE,
        models.DomainStatus.EXPIRED,
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    result = {
        "subdomain": db_site.subdomain,
        "domain_status": db_site.domain_status.value if hasattr(db_site.domain_status, "value") else db_site.domain_status,
        "redirect_to": None,
        "custom_subpath": db_site.custom_subpath,
    }

    try:
        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
    except Exception:
        pass

    return result
