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


def invalidate_domain_lookup_cache(custom_domain: str | None, subdomain: str | None = None) -> None:
    hosts: list[str] = []
    try:
        from ..redis_client import redis_client
        from ..config import settings
        if custom_domain:
            redis_client.delete(f"domain_lookup:{custom_domain}")
            hosts.append(custom_domain)
        if subdomain and settings.ugc_domain:
            redis_client.delete(f"domain_lookup:{subdomain}.{settings.ugc_domain}")
            hosts.append(f"{subdomain}.{settings.ugc_domain}")
    except Exception:
        pass

    if hosts:
        try:
            from ..cache.service import purge_domain_lookup_tags_sync

            purge_domain_lookup_tags_sync(hosts)
        except Exception:
            pass


def restore_domain_access(site) -> None:
    if site.domain_status not in (models.DomainStatus.GRACE, models.DomainStatus.EXPIRED):
        return
    if not site.custom_domain:
        return

    site.domain_status = models.DomainStatus.ACTIVE
    site.grace_started_at = None
    site.grace_expires_at = None
    invalidate_domain_lookup_cache(site.custom_domain, getattr(site, "subdomain", None))


def start_domain_grace_period(site, now: datetime | None = None) -> None:
    if site.domain_status != models.DomainStatus.ACTIVE:
        return

    current_time = now or datetime.now(timezone.utc)
    site.domain_status = models.DomainStatus.GRACE
    site.grace_started_at = current_time
    site.grace_expires_at = current_time + timedelta(days=14)
    invalidate_domain_lookup_cache(site.custom_domain, getattr(site, "subdomain", None))


def expire_domain_access(site) -> None:
    if site.domain_status not in (models.DomainStatus.ACTIVE, models.DomainStatus.GRACE):
        return

    site.domain_status = models.DomainStatus.EXPIRED
    invalidate_domain_lookup_cache(site.custom_domain, getattr(site, "subdomain", None))
