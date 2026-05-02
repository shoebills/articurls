from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from typing import List
import json

from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..utils import require_pro
from ..config import settings
from ..cloudflare.client import CloudflareClient, CloudflareError
from ..redis_client import redis_client
from .schemas import DomainIn, DomainOut, DomainVerifyOut, DomainLookupOut, DomainAddResponse, DNSRecord
from .utils import normalize_hostname, validate_hostname

router = APIRouter(tags=["Domain"])


def _invalidate_domain_cache(hostname: str) -> None:
    """Clear cached domain lookup for a hostname."""
    try:
        redis_client.delete(f"domain_lookup:{hostname}")
    except Exception:
        pass


# ── Helper functions ─────────────────────────────────────────────────────────

def extract_dns_instructions(cf_result: dict, hostname: str) -> List[DNSRecord]:
    """
    Extract complete DNS instructions from Cloudflare response.
    Includes ownership TXT, ALL SSL TXT records, and CNAME routing record.
    """
    dns_instructions = []
    
    # Ownership verification TXT record
    ownership = cf_result.get("ownership_verification", {})
    if ownership.get("name") and ownership.get("value"):
        dns_instructions.append(DNSRecord(
            type="TXT",
            name=ownership["name"],
            value=ownership["value"],
            purpose="ownership"
        ))
    
    # SSL validation TXT records - include ALL records
    ssl_info = cf_result.get("ssl", {})
    validation_records = ssl_info.get("validation_records", [])
    for record in validation_records:
        if record.get("txt_name") and record.get("txt_value"):
            dns_instructions.append(DNSRecord(
                type="TXT",
                name=record["txt_name"],
                value=record["txt_value"],
                purpose="ssl"
            ))
    
    # CNAME routing record
    dns_instructions.append(DNSRecord(
        type="CNAME",
        name=hostname,
        value=settings.cloudflare_fallback_origin,
        purpose="routing"
    ))
    
    return dns_instructions



# ── Authenticated user endpoints ─────────────────────────────────────────────

@router.post("/settings/domain", response_model=DomainAddResponse, status_code=status.HTTP_200_OK)
def add_domain(
    body: DomainIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    """
    Add a custom domain and create Cloudflare Custom Hostname.
    Returns DNS instructions for ownership and SSL verification.
    """
    hostname = normalize_hostname(body.hostname)
    validate_hostname(hostname)

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check for duplicate domain BEFORE calling Cloudflare
    existing = db.query(models.User).filter(
        models.User.custom_domain.ilike(hostname),
        models.User.user_id != current_user.user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    # Create custom hostname in Cloudflare
    cf_client = CloudflareClient()
    try:
        cf_result = cf_client.create_custom_hostname(hostname)
    except CloudflareError as e:
        import json as _json
        try:
            cf_body = _json.loads(e.body)
            cf_errors = cf_body.get("errors", [])
            detail = cf_errors[0].get("message", "Cloudflare error") if cf_errors else "Cloudflare error"
        except Exception:
            detail = e.body or "Cloudflare error"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cloudflare: {detail}",
        )
    
    if not cf_result:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create custom hostname in Cloudflare. Please try again.",
        )

    # Extract complete DNS instructions
    dns_instructions = extract_dns_instructions(cf_result, hostname)

    # Update database
    db_user.custom_domain = hostname
    db_user.domain_status = models.DomainStatus.PENDING
    db_user.cloudflare_hostname_id = cf_result.get("id")
    db_user.is_domain_verified = False
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Clean up Cloudflare hostname if DB fails
        if cf_result.get("id"):
            cf_client.delete_custom_hostname(cf_result["id"])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    _invalidate_domain_cache(hostname)
    return DomainAddResponse(
        hostname=hostname,
        domain_status=models.DomainStatus.PENDING,
        dns_instructions=dns_instructions
    )


@router.get("/settings/domain", response_model=DomainOut, response_model_by_alias=False, status_code=status.HTTP_200_OK)
def get_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get current domain configuration.
    For pending domains with Cloudflare hostname, fetches updated status.
    """
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # If domain is pending and has Cloudflare hostname, check for updates
    if (db_user.domain_status == models.DomainStatus.PENDING and 
        db_user.cloudflare_hostname_id):
        
        cf_client = CloudflareClient()
        cf_result = cf_client.get_custom_hostname(db_user.cloudflare_hostname_id)
        
        if cf_result:
            # Check if domain became active
            hostname_status = cf_result.get("status", "pending")
            ssl_info = cf_result.get("ssl", {})
            ssl_status = ssl_info.get("status", "pending_validation")
            
            if hostname_status == "active" and ssl_status == "active":
                # Update to active status
                db_user.domain_status = models.DomainStatus.ACTIVE
                db_user.is_domain_verified = True
                db_user.verified_at = datetime.now(timezone.utc)
                db.commit()
    
    return db_user


@router.post("/settings/domain/verify", response_model=DomainVerifyOut, status_code=status.HTTP_200_OK)
def verify_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    """
    Verify custom domain by checking Cloudflare status.
    Forces a recheck if DNS records are configured.
    """
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not db_user.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No custom domain configured.",
        )

    if not db_user.cloudflare_hostname_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Domain not registered with Cloudflare. Please add domain again.",
        )

    if db_user.domain_status == models.DomainStatus.ACTIVE:
        return DomainVerifyOut(
            verification_status="already_verified",
            domain_status=db_user.domain_status,
            dns_instructions=None
        )

    # Simple rate limiting: prevent verify calls within 3 seconds
    if db_user.updated_at:
        time_since_update = (datetime.now(timezone.utc) - db_user.updated_at).total_seconds()
        if time_since_update < 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait a few seconds before verifying again.",
            )

    # Try to force recheck in Cloudflare (safe - doesn't block on failure)
    cf_client = CloudflareClient()
    cf_result = None
    
    try:
        cf_result = cf_client.force_recheck(db_user.cloudflare_hostname_id)
    except Exception:
        pass  # Ignore force_recheck failures
    
    # Fallback: get current status
    if not cf_result:
        cf_result = cf_client.get_custom_hostname(db_user.cloudflare_hostname_id)
    
    if not cf_result:
        # Cloudflare failure - do NOT change DB, return pending
        return DomainVerifyOut(
            verification_status="pending",
            domain_status=db_user.domain_status,
            dns_instructions=None
        )

    # Extract status from Cloudflare response - use EXACT fields
    hostname_status = cf_result.get("status")
    ssl_info = cf_result.get("ssl", {})
    ssl_status = ssl_info.get("status")

    # STRICT activation condition - use EXACT Cloudflare status values
    if hostname_status == "active" and ssl_status == "active":
        # Domain is fully verified and active
        db_user.domain_status = models.DomainStatus.ACTIVE
        db_user.is_domain_verified = True
        db_user.verified_at = datetime.now(timezone.utc)
        db.commit()
        _invalidate_domain_cache(db_user.custom_domain)
        
        return DomainVerifyOut(
            verification_status="verified",
            domain_status=models.DomainStatus.ACTIVE,
            dns_instructions=None
        )
    
    # Not ready yet - return current DNS instructions
    dns_instructions = extract_dns_instructions(cf_result, db_user.custom_domain)

    return DomainVerifyOut(
        verification_status="pending",
        domain_status=db_user.domain_status,
        dns_instructions=dns_instructions if dns_instructions else None
    )


@router.delete("/settings/domain", status_code=status.HTTP_200_OK)
def delete_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Delete custom domain and remove from Cloudflare.
    Ignores Cloudflare 404 errors (already deleted).
    """
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete from Cloudflare if hostname_id exists
    if db_user.cloudflare_hostname_id:
        cf_client = CloudflareClient()
        cf_client.delete_custom_hostname(db_user.cloudflare_hostname_id)
        # Ignore result - we clear DB fields regardless

    old_domain = db_user.custom_domain
    # Clear database fields
    db_user.custom_domain = None
    db_user.domain_status = models.DomainStatus.NONE
    db_user.is_domain_verified = False
    db_user.cloudflare_hostname_id = None
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    db.commit()
    if old_domain:
        _invalidate_domain_cache(old_domain)
    return {"message": "Custom domain removed."}


import json
from ..redis_client import redis_client

# ── Internal endpoint (middleware → API) ─────────────────────────────────────

_DOMAIN_CACHE_TTL = 60  # seconds

@router.get("/internal/domain-lookup", response_model=DomainLookupOut, status_code=status.HTTP_200_OK)
def domain_lookup(hostname: str, request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if secret and request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    normalized = normalize_hostname(hostname)
    cache_key = f"domain_lookup:{normalized}"

    # Try cache first
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass  # Redis unavailable — fall through to DB

    db_user = (
        db.query(models.User)
        .filter(models.User.custom_domain.ilike(normalized))
        .first()
    )

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    result = {"username": db_user.user_name, "domain_status": db_user.domain_status}

    # Cache the result
    try:
        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
    except Exception:
        pass  # Redis unavailable — serve uncached

    return result
