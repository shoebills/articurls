from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..utils.entitlements import require_pro
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal
from fastapi.responses import StreamingResponse
from urllib.parse import urlparse
import io
import csv
import httpx


router = APIRouter(
    tags=["Analytics"],
    prefix="/analytics"
)


def _umami_error_detail(exc_body: str) -> str:
    """Return a clean error detail, stripping raw HTML from upstream errors."""
    body = (exc_body or "").strip()
    if body.startswith("<") or "<!DOCTYPE" in body or "<html" in body:
        return "Analytics service temporarily unavailable. Please try again later."
    if len(body) > 200:
        body = body[:200] + "…"
    return f"Failed to retrieve analytics: {body}"

PERIOD_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
}


def get_since(period: Optional[str], now: datetime | None = None):
    if period is None:
        return None
    now = now or datetime.now(timezone.utc)
    if period in PERIOD_MAP:
        return now - PERIOD_MAP[period]
    if period == "this_month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if period == "last_month":
        if now.month == 1:
            return now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        return now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if period == "this_year":
        return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if period == "1y":
        return now.replace(year=now.year - 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


def normalize_referrer_host(value: str) -> str:
    raw = value.strip().lower()
    if not raw:
        return ""

    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


def _time_unit(period: Optional[str]) -> Literal["hour", "day", "month"]:
    if period == "24h":
        return "hour"
    if period in ("7d", "this_month", "last_month"):
        return "day"
    return "month"


MONTH_SLOT_COUNTS: dict[str, int] = {}
DAY_SLOT_COUNTS: dict[str, int] = {"7d": 7}
HOUR_SLOT_COUNTS: dict[str, int] = {"24h": 25}


def _generate_series_slots(start: datetime, unit: str, end: datetime, period: Optional[str] = None) -> list[datetime]:
    slots: list[datetime] = []
    if unit == "hour":
        slot_count = HOUR_SLOT_COUNTS.get(period or "", 0)
        if slot_count and slot_count > 0:
            anchor = end.replace(minute=0, second=0, microsecond=0)
            for i in range(slot_count - 1, -1, -1):
                slots.append(anchor - timedelta(hours=i))
        else:
            current = start.replace(minute=0, second=0, microsecond=0)
            stop = end.replace(minute=59, second=59, microsecond=999999)
            while current <= stop:
                slots.append(current)
                current += timedelta(hours=1)
    elif unit == "day":
        slot_count = DAY_SLOT_COUNTS.get(period or "", 0)
        if slot_count and slot_count > 0:
            anchor = end.replace(hour=0, minute=0, second=0, microsecond=0)
            for i in range(slot_count - 1, -1, -1):
                slots.append(anchor - timedelta(days=i))
        else:
            current = start.replace(hour=0, minute=0, second=0, microsecond=0)
            stop = end.replace(hour=23, minute=59, second=59, microsecond=999999)
            while current <= stop:
                slots.append(current)
                current += timedelta(days=1)
    else:
        slot_count = MONTH_SLOT_COUNTS.get(period or "", 0)
        if slot_count and slot_count > 0:
            anchor = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            for i in range(slot_count - 1, -1, -1):
                year = anchor.year
                month = anchor.month - i
                while month < 1:
                    month += 12
                    year -= 1
                slots.append(anchor.replace(year=year, month=month))
        else:
            current = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            stop = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            while current <= stop:
                slots.append(current)
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    current = current.replace(month=current.month + 1)
    return slots


def _build_series(
    db: Session,
    user_id: int,
    unit: str,
    slots: list[datetime],
    since: datetime,
) -> list[dict]:
    sub_query = db.query(models.Subscriber).filter(
        models.Subscriber.user_id == user_id,
        models.Subscriber.is_confirmed == True,
    )

    trunc_unit = {"hour": "hour", "day": "day", "month": "month"}[unit]

    sub_rows = (
        sub_query
        .filter(models.Subscriber.subscribed_at >= since)
        .with_entities(
            func.date_trunc(trunc_unit, models.Subscriber.subscribed_at).label("ts"),
            func.count(models.Subscriber.subscriber_id).label("cnt"),
        )
        .group_by("ts")
        .all()
    )
    unsub_rows = (
        sub_query
        .filter(models.Subscriber.unsubscribed_at >= since)
        .with_entities(
            func.date_trunc(trunc_unit, models.Subscriber.unsubscribed_at).label("ts"),
            func.count(models.Subscriber.subscriber_id).label("cnt"),
        )
        .group_by("ts")
        .all()
    )

    sub_map = {}
    for row in sub_rows:
        ts = row.ts.replace(tzinfo=timezone.utc) if row.ts.tzinfo is None else row.ts
        sub_map[ts] = row.cnt
    unsub_map = {}
    for row in unsub_rows:
        ts = row.ts.replace(tzinfo=timezone.utc) if row.ts.tzinfo is None else row.ts
        unsub_map[ts] = row.cnt

    series = []
    for slot in slots:
        slot_aware = slot.replace(tzinfo=timezone.utc)
        series.append({
            "timestamp": slot_aware.isoformat(),
            "subscribed": sub_map.get(slot_aware, 0),
            "unsubscribed": unsub_map.get(slot_aware, 0),
        })
    return series


@router.get("/subscribers", status_code=status.HTTP_200_OK)
def subscribers_analytics(period: Optional[str] = "all", db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    current_subscribers = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.unsubscribed_at.is_(None), models.Subscriber.is_confirmed == True).scalar()

    unit = _time_unit(period)
    now = datetime.now(timezone.utc)
    since = get_since(period, now)

    sub_query = db.query(models.Subscriber).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.is_confirmed == True)

    if since:
        until = None
        if period == "1y":
            until = since.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
        elif period == "last_month":
            until = since.replace(day=28) + timedelta(days=4)
            until = until.replace(day=1) - timedelta(microseconds=1)
        if until:
            subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.subscribed_at >= since, models.Subscriber.subscribed_at <= until).scalar()
            unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at >= since, models.Subscriber.unsubscribed_at <= until).scalar()
        else:
            subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.subscribed_at >= since).scalar()
            unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at >= since).scalar()
    else:
        subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).scalar()
        unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at.isnot(None)).scalar()

    if since is None:
        account_since = current_user.created_at
        if account_since and account_since.tzinfo is None:
            account_since = account_since.replace(tzinfo=timezone.utc)
        if not account_since:
            account_since = datetime(2026, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
        if unit == "month":
            since = account_since.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif unit == "day":
            since = account_since.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            since = account_since.replace(minute=0, second=0, microsecond=0)

    slot_end = now
    if period == "last_month":
        slot_end = since.replace(day=28) + timedelta(days=4)
        slot_end = slot_end.replace(day=1) - timedelta(days=1)
        slot_end = slot_end.replace(hour=23, minute=59, second=59, microsecond=999999)
    if period == "1y":
        slot_end = since.replace(month=12, day=1, hour=0, minute=0, second=0, microsecond=0)

    slots = _generate_series_slots(since, unit, slot_end, period)
    series = _build_series(db, current_user.user_id, unit, slots, since)

    return {
        "period": period,
        "current_subscribers": current_subscribers,
        "subscribed": subscribed,
        "unsubscribed": unsubscribed,
        "series": series,
    }


@router.get("/export-to-csv", status_code=status.HTTP_200_OK)
def export_subscribers(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_subscribers = db.query(models.Subscriber).filter(
        models.Subscriber.user_id == current_user.user_id, 
        models.Subscriber.unsubscribed_at.is_(None), 
        models.Subscriber.is_confirmed.is_(True)
        ).order_by(models.Subscriber.subscribed_at.desc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["email", "subscribed_at"])

    for sub in db_subscribers:  
        subscribed_at = sub.subscribed_at.isoformat() if sub.subscribed_at else ""
        writer.writerow([sub.email, subscribed_at])

    csv_content = buffer.getvalue()
    buffer.close()
 
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=subscribers.csv"},
    ) 





@router.get("/umami/overview", status_code=status.HTTP_200_OK)
def get_umami_overview(
    period: str = "7d",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        start_at, end_at = get_umami_period_timestamps(period)
        stats = client.get_website_stats_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
        )

        visits = stats.get("visits", 0)
        bounces = stats.get("bounces", 0)
        totaltime = stats.get("totaltime", 0)

        bounce_rate = round((bounces / visits * 100), 1) if visits > 0 else 0
        avg_visit_time = round(totaltime / visits) if visits > 0 else 0

        return {
            "period": period,
            "overview": {
                "pageviews": stats.get("pageviews", 0),
                "visitors": stats.get("visitors", 0),
                "visits": visits,
                "bounce_rate": bounce_rate,
                "avg_visit_time": avg_visit_time,
            },
            "change": None,
        }
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/timeseries", status_code=status.HTTP_200_OK)
def get_umami_timeseries(
    period: str = "7d",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps, get_umami_period_unit

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        account_ts = None
        if period == "all" and current_user.created_at is not None:
            created = current_user.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            account_ts = created.timestamp() * 1000
        start_at, end_at = get_umami_period_timestamps(period, account_created_at=account_ts)
        unit = get_umami_period_unit(period)

        pageviews_data = client.get_website_pageviews_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            unit=unit,
        )

        # Umami's pageviews endpoint returns `sessions` for the secondary series
        # in current docs/API versions. Keep exposing `visitors` to the frontend
        # so we can fix the flat line without changing the chart contract.
        visitors_series = pageviews_data.get("visitors")
        if visitors_series is None:
            visitors_series = pageviews_data.get("sessions", [])

        return {
            "period": period,
            "unit": unit,
            "pageviews": pageviews_data.get("pageviews", []),
            "visitors": visitors_series,
        }
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/pages", status_code=status.HTTP_200_OK)
def get_umami_pages(
    period: str = "7d",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        start_at, end_at = get_umami_period_timestamps(period)
        pages = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="path",
            limit=limit,
        )

        published_blog_slugs = {
            row[0]
            for row in db.query(models.Blog.slug)
            .filter(
                models.Blog.user_id == current_user.user_id,
                models.Blog.status == models.BlogStatus.PUBLISHED,
            )
            .all()
        }
        archived_blog_slugs = {
            row[0]
            for row in db.query(models.Blog.slug)
            .filter(
                models.Blog.user_id == current_user.user_id,
                models.Blog.status == models.BlogStatus.ARCHIVED,
            )
            .all()
        }
        published_page_slugs = {
            row[0]
            for row in db.query(models.UserPage.slug)
            .filter(
                models.UserPage.user_id == current_user.user_id,
                models.UserPage.status == models.PageStatus.PUBLISHED,
            )
            .all()
        }
        archived_page_slugs = {
            row[0]
            for row in db.query(models.UserPage.slug)
            .filter(
                models.UserPage.user_id == current_user.user_id,
                models.UserPage.status == models.PageStatus.ARCHIVED,
            )
            .all()
        }

        SYSTEM_PATHS = {"/", "/rss.xml", "/sitemap.xml", "/confirm-subscription", "/unsubscribe"}

        username_lower = current_user.user_name.lower()

        def resolve_path_status(path: str) -> str:
            p = path.strip().rstrip("/") or "/"
            if p in SYSTEM_PATHS:
                return "live"
            # custom domain: /blog/{slug} or /page/{slug}
            if p.startswith("/blog/"):
                slug = p[len("/blog/"):]
                if slug in published_blog_slugs:
                    return "live"
                if slug in archived_blog_slugs:
                    return "archived"
                return "deleted"
            if p.startswith("/page/"):
                slug = p[len("/page/"):]
                if slug in published_page_slugs:
                    return "live"
                if slug in archived_page_slugs:
                    return "archived"
                return "deleted"
            parts = p.lstrip("/").split("/")
            # shared domain: /{username} — profile homepage
            if len(parts) == 1 and parts[0].lower() == username_lower:
                return "live"
            # shared domain: /{username}/blog/{slug} or /{username}/page/{slug}
            if len(parts) >= 3 and parts[0].lower() == username_lower and parts[1] == "blog":
                slug = "/".join(parts[2:])
                if slug in published_blog_slugs:
                    return "live"
                if slug in archived_blog_slugs:
                    return "archived"
                return "deleted"
            if len(parts) >= 3 and parts[0].lower() == username_lower and parts[1] == "page":
                slug = "/".join(parts[2:])
                if slug in published_page_slugs:
                    return "live"
                if slug in archived_page_slugs:
                    return "archived"
                return "deleted"
            # shared domain: /{username}/category/* — always live (category pages)
            if len(parts) >= 3 and parts[0].lower() == username_lower and parts[1] == "category":
                return "live"
            return "deleted"

        enriched = [
            {"x": row["x"], "y": row["y"], "status": resolve_path_status(row["x"])}
            for row in pages
        ]

        return {"period": period, "rows": enriched}
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/sources", status_code=status.HTTP_200_OK)
def get_umami_sources(
    period: str = "7d",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps, umami_internal_domains

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        start_at, end_at = get_umami_period_timestamps(period)
        referrers = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="referrer",
            limit=500,
        )
        internal_domains = umami_internal_domains()
        filtered_referrers = [
            row for row in referrers
            if normalize_referrer_host(str(row.get("x", ""))) not in internal_domains
        ]

        try:
            stats = client.get_website_stats_sync(
                current_user.umami_website_id,
                start_at=start_at,
                end_at=end_at,
            )
            total_visitors = stats.get("visitors") or 0
            if isinstance(total_visitors, dict):
                total_visitors = total_visitors.get("value", 0)
            referred_visitors = sum(int(row.get("y", 0)) for row in referrers)
            direct_count = total_visitors - referred_visitors
            if direct_count > 0:
                filtered_referrers = [{"x": "", "y": direct_count}] + filtered_referrers[:limit - 1]
            else:
                filtered_referrers = filtered_referrers[:limit]
        except Exception:
            filtered_referrers = filtered_referrers[:limit]

        return {"period": period, "referrers": filtered_referrers}
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/geo", status_code=status.HTTP_200_OK)
def get_umami_geo(
    period: str = "7d",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        start_at, end_at = get_umami_period_timestamps(period)
        countries = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="country",
            limit=limit,
        )

        return {"period": period, "countries": countries}
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/tech", status_code=status.HTTP_200_OK)
def get_umami_tech(
    period: str = "7d",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import get_umami_period_timestamps

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        start_at, end_at = get_umami_period_timestamps(period)

        browsers = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="browser",
            limit=limit,
        )
        os_list = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="os",
            limit=limit,
        )
        devices = client.get_website_metrics_sync(
            current_user.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type="device",
            limit=limit,
        )

        return {
            "period": period,
            "browsers": browsers,
            "os": os_list,
            "devices": devices,
        }
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )


@router.get("/umami/realtime", status_code=status.HTTP_200_OK)
def get_umami_realtime(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    from ..umami.client import UmamiClient, UmamiError

    if not current_user.umami_website_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Umami website not provisioned yet.",
        )

    client = UmamiClient()
    if not client.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not configured.",
        )

    try:
        realtime = client.get_realtime_sync(current_user.umami_website_id)

        return {
            "active_visitors": realtime.get("totals", {}).get("visitors", 0),
            "urls": realtime.get("urls", {}),
            "countries": realtime.get("countries", {}),
            "referrers": realtime.get("referrers", {}),
            "events": realtime.get("events", []),
        }
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=_umami_error_detail(exc.body),
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Analytics service temporarily unavailable. Please try again later.",
        )
