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


def provision_umami_website_for_site(db: Session, site_id: Any) -> str | None:
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


def provision_umami_website_for_user(db: Session, user_id: Any) -> str | None:
    sites = db.query(models.Site).filter(models.Site.user_id == user_id).all()
    first_id = None
    for site in sites:
        res = provision_umami_website_for_site(db, site.site_id)
        if not first_id:
            first_id = res
    return first_id


def sync_umami_website_domain_for_user(db: Session, user_id: Any) -> None:
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


def enqueue_umami_provision(user_id: Any) -> None:
    if not UmamiClient().configured:
        return
    from ..workers.tasks import provision_umami_website

    provision_umami_website.delay(str(user_id))


def enqueue_umami_domain_sync(user_id: Any) -> None:
    if not UmamiClient().configured:
        return
    from ..workers.tasks import sync_umami_website_domain

    sync_umami_website_domain.delay(str(user_id))


# ---------------------------------------------------------------------------
# Analytics periods
#
# Canonical period tokens (mirrors Umami's DateFilter semantics):
#   today, 24h, this_week, 7d, this_month, 30d, 90d, this_year, 6m, 12m, all,
#   range:<YYYY-MM-DD>:<YYYY-MM-DD>  (calendar days in the site's timezone)
#
# Legacy tokens kept parsing for backward compatibility (old cached URLs):
#   last_month, 1y
#
# Calendar-boundary periods are computed in the site's timezone; rolling
# windows are hour/day aligned and timezone independent.
# ---------------------------------------------------------------------------

import calendar as _calendar
from datetime import datetime, timedelta, timezone as _timezone
from zoneinfo import ZoneInfo

VALID_PERIOD_TOKENS = {
    "today", "24h", "this_week", "7d", "this_month", "30d",
    "90d", "this_year", "6m", "12m", "all",
}


def resolve_timezone(tz: str | None) -> ZoneInfo:
    """Return a ZoneInfo for tz, falling back to UTC for None/invalid values."""
    if tz:
        try:
            return ZoneInfo(tz)
        except Exception:
            pass
    return ZoneInfo("UTC")


def _start_of_period_days(now_utc: datetime, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Return (local_now, local_midnight) in tz as aware datetimes."""
    local_now = now_utc.astimezone(tz)
    local_start = local_now.replace(hour=0, minute=0,  second=0, microsecond=0)
    return local_now, local_start


def _shift_months(dt: datetime, months: int) -> datetime:
    """Shift a datetime by N calendar months, clamping day overflow."""
    total = dt.month - 1 + months
    year = dt.year + total // 12
    month = total % 12 + 1
    day = min(dt.day, _calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _range_bounds(period: str, tz: ZoneInfo) -> tuple[int, int]:
    """Parse `range:<YYYY-MM-DD>:<YYYY-MM-DD>` into UTC ms timestamps.

    Both bounds are calendar days in the site's timezone: the window covers
    the first day's midnight through the last day's end, inclusive.
    """
    try:
        _, start_raw, end_raw = period.split(":")
        start_date = datetime.strptime(start_raw, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_raw, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"Invalid period range: {period}") from exc

    if end_date < start_date:
        raise ValueError(f"Invalid period range (end before start): {period}")

    tzinfo = resolve_timezone(tz)
    start = datetime(start_date.year, start_date.month, start_date.day, tzinfo=tzinfo)
    end = datetime(end_date.year, end_date.month, end_date.day, tzinfo=tzinfo)
    end = end + timedelta(days=1) - timedelta(microseconds=1)

    return int(start.timestamp() * 1000), int(end.timestamp() * 1000)


def get_umami_period_timestamps(
    period: str,
    account_created_at: float | None = None,
    tz: str | None = None,
) -> tuple[int, int]:
    """Map a period token to (start_at_ms, end_at_ms).

    Raises ValueError for unknown tokens so routers can return a 400.
    """
    now = datetime.now(_timezone.utc)

    if period.startswith("range:"):
        return _range_bounds(period, tz)

    tzinfo = resolve_timezone(tz)
    local_now, local_start = _start_of_period_days(now, tzinfo)

    if period == "today":
        start_at = int(local_start.timestamp() * 1000)
    elif period == "24h":
        # Hour-aligned rolling window (Umami: subHours(startOfHour(now), 24))
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        start_at = int((hour_start - timedelta(hours=24)).timestamp() * 1000)
    elif period == "this_week":
        # Umami's DateFilter resolves "This week" via date-fns startOfWeek
        # with the UI locale; the en-US default starts weeks on Sunday.
        days_since_sunday = (local_now.weekday() + 1) % 7
        week_start = (local_now - timedelta(days=days_since_sunday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        start_at = int(week_start.timestamp() * 1000)
    elif period == "7d":
        # Day-aligned rolling window (Umami: subDays(startOfDay(now), 7))
        start_at = int((local_start - timedelta(days=7)).timestamp() * 1000)
    elif period == "this_month":
        month_start = local_now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        start_at = int(month_start.timestamp() * 1000)
    elif period == "30d":
        start_at = int((local_start - timedelta(days=30)).timestamp() * 1000)
    elif period == "90d":
        start_at = int((local_start - timedelta(days=90)).timestamp() * 1000)
    elif period == "this_year":
        year_start = local_now.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        start_at = int(year_start.timestamp() * 1000)
    elif period == "6m":
        # Month-boundary aligned (Umami: subMonths(startOfMonth(now), 6))
        months_start = _shift_months(local_start.replace(day=1), -6)
        start_at = int(months_start.timestamp() * 1000)
    elif period == "12m":
        months_start = _shift_months(local_start.replace(day=1), -12)
        start_at = int(months_start.timestamp() * 1000)
    elif period == "all":
        start_at = int(account_created_at) if account_created_at is not None else 0
    elif period == "last_month":
        # Legacy alias (kept for old cached URLs, no longer offered in the UI)
        first_of_month = local_start.replace(day=1)
        last_month_start = _shift_months(first_of_month, -1)
        end = first_of_month - timedelta(microseconds=1)
        return int(last_month_start.timestamp() * 1000), int(end.timestamp() * 1000)
    elif period == "1y":
        # Legacy alias: previous calendar year in the site's timezone
        year_start = local_now.replace(
            month=1, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        start_at = int(_shift_months(year_start, -12).timestamp() * 1000)
        end = year_start - timedelta(microseconds=1)
        return start_at, int(end.timestamp() * 1000)
    else:
        raise ValueError(f"Unknown period: {period}")

    return start_at, int(now.timestamp() * 1000)


def get_umami_period_unit(period: str) -> str:
    """Resolve the chart bucketing unit for a period (Umami's rules)."""
    if period.startswith("range:"):
        try:
            _, start_raw, end_raw = period.split(":")
            start = datetime.strptime(start_raw, "%Y-%m-%d")
            end = datetime.strptime(end_raw, "%Y-%m-%d") + timedelta(days=1)
        except ValueError:
            return "day"
        hours = (end - start).total_seconds() / 3600
        if hours <= 48:
            return "hour"
        months_diff = (end.year - start.year) * 12 + (end.month - start.month)
        if months_diff <= 7:
            return "day"
        return "month"
    if period in ("today", "24h"):
        return "hour"
    if period in ("this_week", "7d", "this_month", "last_month", "30d", "90d"):
        return "day"
    return "month"


def normalize_bucket_key(x: str, unit: str) -> str:
    """Normalize an Umami bucket label to the key format used for slot filling.

    Umami returns bucket labels like "2026-05-22T00:00:00Z" (day), with varying
    suffixes across versions; the prefix for the unit is stable.
    """
    x = (x or "").strip()
    if unit == "hour":
        return x[:13]  # "YYYY-MM-DDTHH"
    if unit == "day":
        return x[:10]  # "YYYY-MM-DD"
    return x[:7]       # "YYYY-MM"


def generate_period_slots(
    start_at: int, end_at: int, unit: str, tz: str | None = None
) -> list[str]:
    """Generate every bucket key between start_at and end_at at the given unit.

    Keys are wall-clock strings in the site's timezone:
      hour  -> "YYYY-MM-DDTHH"      day  -> "YYYY-MM-DD"      month -> "YYYY-MM"
    """
    tzinfo = resolve_timezone(tz)
    start = datetime.fromtimestamp(start_at / 1000, tz=_timezone.utc).astimezone(tzinfo)
    end = datetime.fromtimestamp(end_at / 1000, tz=_timezone.utc).astimezone(tzinfo)

    slots: list[str] = []
    if unit == "hour":
        current = start.replace(minute=0, second=0, microsecond=0)
        while current <= end and len(slots) < 500:
            slots.append(current.strftime("%Y-%m-%dT%H"))
            current += timedelta(hours=1)
    elif unit == "day":
        current = start.replace(hour=0, minute=0, second=0, microsecond=0)
        while current <= end and len(slots) < 500:
            slots.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
    else:
        current = start.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        while current <= end and len(slots) < 500:
            slots.append(current.strftime("%Y-%m"))
            current = _shift_months(current, 1)
    return slots

