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

    Prefers Delegated DCV (single CNAME for SSL) over per-cert TXT records
    when available — this works even on DNS providers that only allow one
    TXT record per name (e.g. Hostinger).

    Falls back to individual TXT validation_records if no delegation CNAME exists.
    """
    dns_instructions = []

    # Ownership verification TXT record
    ownership = cf_result.get("ownership_verification", {})
    ownership_verified = cf_result.get("status") == "active"
    if ownership.get("name") and ownership.get("value"):
        dns_instructions.append(DNSRecord(
            type="TXT",
            name=ownership["name"],
            value=ownership["value"],
            purpose="ownership",
            verified=ownership_verified,
        ))

    ssl_info = cf_result.get("ssl", {})
    ssl_active = ssl_info.get("status") == "active"

    # Prefer Delegated DCV CNAME — one record covers both ECDSA + RSA certs
    # and survives renewals without needing new TXT records.
    dcv_delegation = ssl_info.get("dcv_delegation_records", [])
    if dcv_delegation:
        for dcv in dcv_delegation:
            if dcv.get("cname") and dcv.get("cname_target"):
                dns_instructions.append(DNSRecord(
                    type="CNAME",
                    name=dcv["cname"],
                    value=dcv["cname_target"],
                    purpose="ssl",
                    verified=ssl_active,
                ))
    else:
        # Fallback: individual TXT records per certificate (ECDSA + RSA)
        validation_records = ssl_info.get("validation_records", [])
        for record in validation_records:
            if record.get("txt_name") and record.get("txt_value"):
                record_verified = ssl_active or record.get("status") == "active"
                dns_instructions.append(DNSRecord(
                    type="TXT",
                    name=record["txt_name"],
                    value=record["txt_value"],
                    purpose="ssl",
                    verified=record_verified,
                ))

    # CNAME routing record — verified once hostname status is active
    dns_instructions.append(DNSRecord(
        type="CNAME",
        name=hostname,
        value=settings.cloudflare_fallback_origin,
        purpose="routing",
        verified=ownership_verified,
    ))

    return dns_instructions



# ── Authenticated user endpoints ─────────────────────────────────────────────

@router.post("/settings/domain", response_model=DomainAddResponse, status_code=status.HTTP_200_OK)
async def add_domain(
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
        cf_result = await cf_client.create_custom_hostname(hostname)
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

    # Extract whatever DNS instructions are available immediately (may only have
    # ownership + CNAME; SSL records are generated async by Cloudflare).
    # A background task will poll and update them once both SSL records appear.
    dns_instructions = extract_dns_instructions(cf_result, hostname)

    # Update database
    db_user.custom_domain = hostname
    db_user.domain_status = models.DomainStatus.PENDING
    db_user.cloudflare_hostname_id = cf_result.get("id")
    db_user.domain_dns_instructions = [r.model_dump() for r in dns_instructions]
    db_user.is_domain_verified = False
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if cf_result.get("id"):
            await cf_client.delete_custom_hostname(cf_result["id"])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    _invalidate_domain_cache(hostname)

    # Dispatch background task to poll until both SSL records appear
    from ..workers.tasks import poll_domain_ssl_records
    poll_domain_ssl_records.apply_async(
        args=[db_user.user_id],
        countdown=3,  # start after 3 seconds
    )

    return DomainAddResponse(
        hostname=hostname,
        domain_status=models.DomainStatus.PENDING,
        dns_instructions=dns_instructions
    )


@router.get("/settings/domain", response_model=DomainOut, response_model_by_alias=False, status_code=status.HTTP_200_OK)
async def get_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get current domain configuration including cached DNS instructions.
    """
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Deserialize cached DNS instructions from DB
    dns_instructions = None
    if db_user.domain_dns_instructions and db_user.domain_status == models.DomainStatus.PENDING:
        try:
            dns_instructions = [DNSRecord(**r) for r in db_user.domain_dns_instructions]
        except Exception:
            dns_instructions = None

    # A manually-removed domain has EXPIRED status but no cloudflare_hostname_id.
    # Show it as "no domain" in the dashboard so the user can add a new one.
    is_manually_removed = (
        db_user.domain_status == models.DomainStatus.EXPIRED
        and not db_user.cloudflare_hostname_id
    )

    result = DomainOut(
        custom_domain=None if is_manually_removed else db_user.custom_domain,
        domain_status=models.DomainStatus.NONE if is_manually_removed else db_user.domain_status,
        verified_at=db_user.verified_at,
        grace_started_at=db_user.grace_started_at,
        grace_expires_at=db_user.grace_expires_at,
        dns_instructions=dns_instructions,
    )
    return result


@router.post("/settings/domain/verify", response_model=DomainVerifyOut, status_code=status.HTTP_200_OK)
async def verify_domain(
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

    # Try to force recheck in Cloudflare (safe - doesn't block on failure)
    cf_client = CloudflareClient()
    cf_result = None
    
    try:
        cf_result = await cf_client.force_recheck(db_user.cloudflare_hostname_id)
    except Exception:
        pass

    if not cf_result:
        cf_result = await cf_client.get_custom_hostname(db_user.cloudflare_hostname_id)
    
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
        db_user.domain_status = models.DomainStatus.ACTIVE
        db_user.is_domain_verified = True
        db_user.verified_at = datetime.now(timezone.utc)
        db_user.domain_dns_instructions = None  # clear cached instructions on activation
        db.commit()
        _invalidate_domain_cache(db_user.custom_domain)
        
        return DomainVerifyOut(
            verification_status="verified",
            domain_status=models.DomainStatus.ACTIVE,
            dns_instructions=None
        )
    
    # Not ready yet — build DNS instructions, merging with cached records.
    # When Cloudflare validates a record it removes it from the response,
    # so we keep cached records and mark them verified=True if they've disappeared.
    fresh_instructions = extract_dns_instructions(cf_result, db_user.custom_domain)
    fresh_keys = {(r.name, r.value) for r in fresh_instructions}

    # Start with fresh records
    merged: List[DNSRecord] = list(fresh_instructions)

    # Re-add any cached records that are no longer in the CF response (= verified)
    if db_user.domain_dns_instructions:
        try:
            cached = [DNSRecord(**r) for r in db_user.domain_dns_instructions]
            for cached_record in cached:
                if (cached_record.name, cached_record.value) not in fresh_keys:
                    # Not in fresh response = Cloudflare already validated it
                    merged.append(DNSRecord(
                        type=cached_record.type,
                        name=cached_record.name,
                        value=cached_record.value,
                        purpose=cached_record.purpose,
                        verified=True,
                    ))
        except Exception:
            pass

    # Sort: routing last, verified records after unverified within each group
    merged.sort(key=lambda r: (r.purpose == "routing", r.verified))

    # Update DB cache with merged state
    db_user.domain_dns_instructions = [r.model_dump() for r in merged]
    db.commit()

    return DomainVerifyOut(
        verification_status="pending",
        domain_status=db_user.domain_status,
        dns_instructions=merged if merged else None
    )


@router.delete("/settings/domain", status_code=status.HTTP_200_OK)
async def delete_domain(
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
        await cf_client.delete_custom_hostname(db_user.cloudflare_hostname_id)

    old_domain = db_user.custom_domain
    # Keep custom_domain so the hostname lookup can still find this user
    # and issue a 301 redirect to articurls.com/{username}.
    # Setting EXPIRED triggers permanentRedirect in the custom-domain page.
    db_user.domain_status = models.DomainStatus.EXPIRED
    db_user.is_domain_verified = False
    db_user.cloudflare_hostname_id = None
    db_user.domain_dns_instructions = None
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    db.commit()
    if old_domain:
        _invalidate_domain_cache(old_domain)
    return {"message": "Custom domain removed."}


# ── Internal endpoint (middleware → API) ─────────────────────────────────────

_DOMAIN_CACHE_TTL = 60  # seconds

@router.get("/internal/domain-lookup", response_model=DomainLookupOut, status_code=status.HTTP_200_OK)
def domain_lookup(hostname: str, request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
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

    result = {"username": db_user.user_name, "domain_status": db_user.domain_status.value if hasattr(db_user.domain_status, 'value') else db_user.domain_status}

    # Cache the result
    try:
        redis_client.setex(cache_key, _DOMAIN_CACHE_TTL, json.dumps(result))
    except Exception:
        pass  # Redis unavailable — serve uncached

    return result
