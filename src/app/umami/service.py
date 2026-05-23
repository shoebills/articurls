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


def umami_website_name(user: models.User) -> str:
    return f"{user.user_name} — Articurls"


def _primary_umami_domain(user: models.User) -> str:
    domain_status = str(
        user.domain_status.value if hasattr(user.domain_status, "value") else user.domain_status
    )
    if user.custom_domain and domain_status in ("active", "grace"):
        return user.custom_domain.lower().strip()
    return umami_marketing_domain()


def provision_umami_website_for_user(db: Session, user_id: int) -> str | None:
    client = UmamiClient()
    if not client.configured:
        return None

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        return None
    if user.umami_website_id:
        return user.umami_website_id

    name = umami_website_name(user)
    domain = _primary_umami_domain(user)
    result = client.create_website_sync(name=name, domain=domain)
    website_id = result.get("id")
    if not website_id:
        raise UmamiError(500, "Missing website id in Umami create response")

    user.umami_website_id = website_id
    db.commit()
    db.refresh(user)
    logger.info("Provisioned Umami website %s for user_id=%s", website_id, user_id)
    return website_id


def sync_umami_website_domain_for_user(db: Session, user_id: int) -> None:
    client = UmamiClient()
    if not client.configured:
        return

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user or not user.umami_website_id:
        return

    domain = _primary_umami_domain(user)
    client.update_website_sync(user.umami_website_id, domain=domain)
    logger.info(
        "Updated Umami website %s domain to %s for user_id=%s",
        user.umami_website_id,
        domain,
        user_id,
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


def get_umami_period_timestamps(period: str) -> tuple[int, int]:
    """Map period string like '24h', '7d' to startAt/endAt ms timestamps."""
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    end_at = int(now.timestamp() * 1000)

    if period == "24h":
        start_at = int((now - timedelta(hours=24)).timestamp() * 1000)
    elif period == "7d":
        start_at = int((now - timedelta(days=7)).timestamp() * 1000)
    elif period == "28d":
        start_at = int((now - timedelta(days=28)).timestamp() * 1000)
    elif period == "3m":
        start_at = int((now - timedelta(days=90)).timestamp() * 1000)
    elif period == "6m":
        start_at = int((now - timedelta(days=180)).timestamp() * 1000)
    elif period == "1y":
        start_at = int((now - timedelta(days=365)).timestamp() * 1000)
    elif period == "all":
        start_at = 0
    else:
        start_at = int((now - timedelta(days=7)).timestamp() * 1000)

    return start_at, end_at


def get_umami_period_unit(period: str) -> str:
    """Get appropriate time unit for timeseries for a given period."""
    if period == "24h":
        return "hour"
    elif period in ("7d", "28d"):
        return "day"
    else:
        return "month"

