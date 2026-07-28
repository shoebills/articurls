import re
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from .. import models

# articurls.com and any subdomain of it are reserved
_RESERVED_RE = re.compile(r"(^|\.)articurls\.com$", re.IGNORECASE)

# Valid hostname label: letters, digits, hyphens; no leading/trailing hyphen
_HOSTNAME_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)


def normalize_hostname(raw: str) -> str:
    host = raw.strip().lower()
    # strip protocol if someone pastes a full URL
    for prefix in ("https://", "http://"):
        if host.startswith(prefix):
            host = host[len(prefix):]
    # strip path/query
    host = host.split("/")[0].split("?")[0].split("#")[0]
    # strip trailing dot
    host = host.rstrip(".")
    return host


def validate_hostname(hostname: str) -> None:
    if not _HOSTNAME_RE.match(hostname):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid hostname format.",
        )

    if _RESERVED_RE.search(hostname):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="articurls.com domains cannot be used as custom domains.",
        )


def invalidate_domain_lookup_cache(custom_domain: str | None) -> None:
    if not custom_domain:
        return
    try:
        from ..redis_client import redis_client
        redis_client.delete(f"domain_lookup:{custom_domain}")
    except Exception:
        pass


def restore_domain_access(user) -> None:
    if user.domain_status not in (models.DomainStatus.GRACE, models.DomainStatus.EXPIRED):
        return
    if not user.custom_domain:
        return

    user.domain_status = models.DomainStatus.ACTIVE
    user.grace_started_at = None
    user.grace_expires_at = None
    invalidate_domain_lookup_cache(user.custom_domain)


def start_domain_grace_period(user, now: datetime | None = None) -> None:
    if user.domain_status != models.DomainStatus.ACTIVE:
        return

    current_time = now or datetime.now(timezone.utc)
    user.domain_status = models.DomainStatus.GRACE
    user.grace_started_at = current_time
    user.grace_expires_at = current_time + timedelta(days=14)
    invalidate_domain_lookup_cache(user.custom_domain)


def expire_domain_access(user) -> None:
    if user.domain_status != models.DomainStatus.GRACE:
        return

    user.domain_status = models.DomainStatus.EXPIRED
    invalidate_domain_lookup_cache(user.custom_domain)
