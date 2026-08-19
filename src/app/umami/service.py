"""Umami website lifecycle helpers."""
from __future__ import annotations

import logging
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from .client import UmamiClient, UmamiError

logger = logging.getLogger(__name__)


def umami_marketing_domain() -> str:
    parsed = urlparse(settings.marketing_origin.strip())
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


def umami_ugc_domain() -> str:
    parsed = urlparse(settings.ugc_origin.strip())
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


def umami_app_domain() -> str:
    parsed = urlparse(settings.app_base_url.strip())
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


def umami_internal_domains() -> set[str]:
    domains = {umami_marketing_domain(), umami_ugc_domain(), umami_app_domain()}
    expanded: set[str] = set()

    for domain in domains:
        if not domain:
            continue
        expanded.add(domain)
        if not domain.startswith("www."):
            expanded.add(f"www.{domain}")

    return expanded


def umami_website_name(site: models.Site) -> str:
    return f"{site.subdomain} — Articurls"


def _primary_umami_domain(site: models.Site) -> str:
    domain_status = str(
        site.domain_status.value if hasattr(site.domain_status, "value") else site.domain_status
    )
    if site.custom_domain and domain_status in ("active", "grace"):
        return site.custom_domain.lower().strip()
    return f"{site.subdomain}.{umami_ugc_domain()}"


def provision_umami_website_for_site(db: Session, site_id: int) -> str | None:
    client = UmamiClient()
    if not client.configured:
        return None

    site = db.query(models.Site).filter(models.Site.site_id == site_id).first()
    if not site:
        return None
    if site.umami_website_id:
        return site.umami_website_id

    name = umami_website_name(site)
    domain = _primary_umami_domain(site)
    result = client.create_website_sync(name=name, domain=domain)
    website_id = result.get("id")
    if not website_id:
        raise UmamiError(500, "Missing website id in Umami create response")

    site.umami_website_id = website_id
    db.commit()
    db.refresh(site)
    logger.info("Provisioned Umami website %s for site_id=%s", website_id, site_id)
    return website_id


def provision_umami_website_for_user(db: Session, user_id: int) -> str | None:
    sites = db.query(models.Site).filter(models.Site.user_id == user_id).all()
    first_id = None
    for site in sites:
        res = provision_umami_website_for_site(db, site.site_id)
        if not first_id:
            first_id = res
    return first_id


def sync_umami_website_domain_for_user(db: Session, user_id: int) -> None:
    client = UmamiClient()
    if not client.configured:
        return

    sites = db.query(models.Site).filter(models.Site.user_id == user_id).all()
    for site in sites:
        if not site.umami_website_id:
            continue
        domain = _primary_umami_domain(site)
        client.update_website_sync(site.umami_website_id, domain=domain)
        logger.info(
            "Updated Umami website %s domain to %s for site_id=%s",
            site.umami_website_id,
            domain,
            site.site_id,
        )


def enqueue_umami_provision(user_id: int) -> None:
    if not UmamiClient().configured:
        return
    from ..workers.tasks import provision_umami_website

    provision_umami_website.delay(user_id)


def enqueue_umami_domain_sync(user_id: int) -> None:
    if not UmamiClient().configured:
        return
    from ..workers.tasks import sync_umami_website_domain

    sync_umami_website_domain.delay(user_id)


def get_umami_period_timestamps(period: str, account_created_at: float | None = None) -> tuple[int, int]:
    """Map period string like '24h', '7d' to startAt/endAt ms timestamps."""
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    end_at = int(now.timestamp() * 1000)

    if period == "24h":
        start_at = int((now - timedelta(hours=24)).timestamp() * 1000)
    elif period == "7d":
        start_at = int((now - timedelta(days=7)).timestamp() * 1000)
    elif period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_at = int(start.timestamp() * 1000)
    elif period == "last_month":
        if now.month == 1:
            start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        start_at = int(start.timestamp() * 1000)
        end = start.replace(day=28) + timedelta(days=4)
        end = end.replace(day=1) - timedelta(days=1)
        end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
        end_at = int(end.timestamp() * 1000)
    elif period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        start_at = int(start.timestamp() * 1000)
    elif period == "1y":
        start = now.replace(year=now.year - 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        start_at = int(start.timestamp() * 1000)
        end = now.replace(year=now.year - 1, month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        end_at = int(end.timestamp() * 1000)
    elif period == "all":
        if account_created_at is not None:
            start_at = int(account_created_at)
        else:
            start_at = 0
    else:
        start_at = int((now - timedelta(days=7)).timestamp() * 1000)

    return start_at, end_at


def get_umami_period_unit(period: str) -> str:
    """Get appropriate time unit for timeseries for a given period."""
    if period == "24h":
        return "hour"
    elif period in ("7d", "this_month", "last_month"):
        return "day"
    else:
        return "month"
