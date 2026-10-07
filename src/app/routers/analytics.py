from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..security.oauth2 import get_current_site
from datetime import datetime, timezone
from typing import Optional
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


def _resolve_period_bounds(period: str, current_user, current_site):
    """Resolve a period token to (start_at_ms, end_at_ms) using the site timezone.

    Raises HTTPException 400 for unknown periods.
    """
    from ..umami.service import get_umami_period_timestamps

    site_tz = current_site.timezone or None
    account_ts = None
    if period == "all" and current_user.created_at is not None:
        created = current_user.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        account_ts = created.timestamp() * 1000
    try:
        return get_umami_period_timestamps(period, account_created_at=account_ts, tz=site_tz)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown period: {period}",
        )

def normalize_referrer_host(value: str) -> str:
    raw = value.strip().lower()
    if not raw:
        return ""

    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


def _subscriber_bucket_key(ts, unit: str) -> str:
    """Convert a date_trunc result (wall time in the site's timezone) to a slot key."""
    if unit == "hour":
        return ts.strftime("%Y-%m-%dT%H")
    if unit == "day":
        return ts.strftime("%Y-%m-%d")
    return ts.strftime("%Y-%m")


@router.get("/subscribers", status_code=status.HTTP_200_OK)
def subscribers_analytics(period: Optional[str] = "all", db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    from ..umami.service import get_umami_period_unit, generate_period_slots

    current_subscribers = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.site_id == current_site.site_id).scalar()

    site_tz = current_site.timezone or "UTC"
    start_at, end_at = _resolve_period_bounds(period, current_user, current_site)
    unit = get_umami_period_unit(period)

    start_dt = datetime.fromtimestamp(start_at / 1000, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end_at / 1000, tz=timezone.utc)

    sub_query = db.query(models.Subscriber).filter(models.Subscriber.site_id == current_site.site_id)

    subscribed = sub_query.filter(
        models.Subscriber.subscribed_at >= start_dt,
        models.Subscriber.subscribed_at <= end_dt,
    ).with_entities(func.count(models.Subscriber.subscriber_id)).scalar()

    trunc_unit = {"hour": "hour", "day": "day", "month": "month"}[unit]

    # Bucket in the site's timezone: timezone(tz, timestamptz) yields the wall
    # time in that zone, so days align with the user's local calendar.
    sub_rows = (
        sub_query.filter(
            models.Subscriber.subscribed_at >= start_dt,
            models.Subscriber.subscribed_at <= end_dt,
        )
        .with_entities(
            func.date_trunc(trunc_unit, func.timezone(site_tz, models.Subscriber.subscribed_at)).label("ts"),
            func.count(models.Subscriber.subscriber_id).label("cnt"),
        )
        .group_by("ts")
        .all()
    )
    sub_map = {
        _subscriber_bucket_key(row.ts, unit): row.cnt
        for row in sub_rows
    }

    slots = generate_period_slots(start_at, end_at, unit, site_tz)
    series = [
        {"x": slot, "subscribed": sub_map.get(slot, 0)}
        for slot in slots
    ]

    return {
        "period": period,
        "unit": unit,
        "current_subscribers": current_subscribers,
        "subscribed": subscribed,
        "series": series,
    }


@router.get("/export-to-csv", status_code=status.HTTP_200_OK)
def export_subscribers(db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    db_subscribers = db.query(models.Subscriber).filter(
        models.Subscriber.site_id == current_site.site_id
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
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),

):
    from ..umami.client import UmamiClient, UmamiError

    if not current_site.umami_website_id:
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
        start_at, end_at = _resolve_period_bounds(period, current_user, current_site)
        stats = client.get_website_stats_sync(
            current_site.umami_website_id,
            start_at=start_at,
            end_at=end_at,
        )

        pageviews = stats.get("pageviews", 0)
        visitors = stats.get("visitors", 0)
        visits = stats.get("visits", 0)
        bounces = stats.get("bounces", 0)
        totaltime = stats.get("totaltime", 0)

        bounce_rate = round((bounces / visits * 100), 1) if visits > 0 else 0
        avg_visit_time = round(totaltime / visits) if visits > 0 else 0

        change = None
        if period != "all":
            comp = stats.get("comparison")
            if not isinstance(comp, dict) or not comp:
                try:
                    duration_ms = end_at - start_at
                    prev_start = start_at - duration_ms
                    prev_end = start_at
                    comp = client.get_website_stats_sync(
                        current_site.umami_website_id,
                        start_at=prev_start,
                        end_at=prev_end,
                    )
                except Exception:
                    comp = {}

            if isinstance(comp, dict) and comp:
                comp_pageviews = comp.get("pageviews", 0)
                comp_visitors = comp.get("visitors", 0)
                comp_visits = comp.get("visits", 0)
                comp_bounces = comp.get("bounces", 0)
                comp_totaltime = comp.get("totaltime", 0)

                comp_bounce_rate = round((comp_bounces / comp_visits * 100), 1) if comp_visits > 0 else 0
                comp_avg_visit_time = round(comp_totaltime / comp_visits) if comp_visits > 0 else 0

                def _pct(curr: float, prev: float) -> float | None:
                    # Mirror Umami's MetricCard: percent changes are truncated
                    # toward zero to whole integers (JS `Math.abs(~~n)`).
                    if prev > 0:
                        return int(((curr - prev) / prev) * 100)
                    elif curr > 0:
                        return 100
                    elif curr == 0 and prev == 0:
                        return 0
                    return None

                change = {
                    "pageviews": _pct(pageviews, comp_pageviews),
                    "visitors": _pct(visitors, comp_visitors),
                    "bounce_rate": _pct(bounce_rate, comp_bounce_rate),
                    "avg_visit_time": _pct(avg_visit_time, comp_avg_visit_time),
                }

        return {
            "period": period,
            "overview": {
                "pageviews": pageviews,
                "visitors": visitors,
                "visits": visits,
                "bounce_rate": bounce_rate,
                "avg_visit_time": avg_visit_time,
            },
            "change": change,
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
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),

):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import (
        get_umami_period_unit,
        generate_period_slots,
        normalize_bucket_key,
    )

    if not current_site.umami_website_id:
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

    site_tz = current_site.timezone or None

    try:
        start_at, end_at = _resolve_period_bounds(period, current_user, current_site)
        unit = get_umami_period_unit(period)

        pageviews_data = client.get_website_pageviews_sync(
            current_site.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            unit=unit,
            timezone=site_tz or None,
        )

        # Umami's pageviews endpoint returns `sessions` for the secondary series
        # in current docs/API versions.
        visitors_series = pageviews_data.get("visitors")
        if visitors_series is None:
            visitors_series = pageviews_data.get("sessions", [])

        # Fill every slot between the period bounds so the chart never has gaps,
        # regardless of the period or bucket unit.
        slots = generate_period_slots(start_at, end_at, unit, site_tz)
        pv_map = {
            normalize_bucket_key(row.get("x", ""), unit): row.get("y", 0)
            for row in pageviews_data.get("pageviews", [])
        }
        vi_map = {
            normalize_bucket_key(row.get("x", ""), unit): row.get("y", 0)
            for row in visitors_series or []
        }
        series = [
            {"x": slot, "pageviews": pv_map.get(slot, 0), "visitors": vi_map.get(slot, 0)}
            for slot in slots
        ]

        return {
            "period": period,
            "unit": unit,
            "series": series,
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


VALID_METRICS_TYPES = {
    "path",
    "fullPath",
    "entry",
    "exit",
    "referrer",
    "channel",
    "browser",
    "os",
    "device",
    "country",
    "region",
    "city",
}


@router.get("/umami/metrics", status_code=status.HTTP_200_OK)
def get_umami_metrics(
    type: str,
    period: str = "7d",
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import umami_internal_domains

    if type not in VALID_METRICS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric type: {type}",
        )

    if not current_site.umami_website_id:
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
        start_at, end_at = _resolve_period_bounds(period, current_user, current_site)
        rows = client.get_website_metrics_sync(
            current_site.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type=type,
            limit=500 if type == "referrer" else limit,
        )

        if type == "referrer":
            internal_domains = umami_internal_domains()
            filtered = [
                row for row in rows
                if normalize_referrer_host(str(row.get("x", ""))) not in internal_domains
            ]
            try:
                stats = client.get_website_stats_sync(
                    current_site.umami_website_id,
                    start_at=start_at,
                    end_at=end_at,
                )
                total_visitors = stats.get("visitors") or 0
                if isinstance(total_visitors, dict):
                    total_visitors = total_visitors.get("value", 0)
                referred_visitors = sum(int(r.get("y", 0)) for r in rows)
                direct_count = total_visitors - referred_visitors
                if direct_count > 0:
                    filtered = [{"x": "", "y": direct_count}] + filtered[:limit - 1]
                else:
                    filtered = filtered[:limit]
            except Exception:
                filtered = filtered[:limit]
            rows = filtered

        return {"period": period, "type": type, "rows": rows}
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


@router.get("/umami/metrics/expanded", status_code=status.HTTP_200_OK)
def get_umami_metrics_expanded(
    type: str,
    period: str = "7d",
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    from ..umami.client import UmamiClient, UmamiError
    from ..umami.service import umami_internal_domains

    if type not in VALID_METRICS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metric type: {type}",
        )

    if not current_site.umami_website_id:
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
        start_at, end_at = _resolve_period_bounds(period, current_user, current_site)
        rows = client.get_website_expanded_metrics_sync(
            current_site.umami_website_id,
            start_at=start_at,
            end_at=end_at,
            type=type,
            limit=limit,
            search=search,
        )

        if type == "referrer":
            internal_domains = umami_internal_domains()
            rows = [
                row for row in rows
                if normalize_referrer_host(str(row.get("name", ""))) not in internal_domains
            ]

        return {"period": period, "type": type, "rows": rows}
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
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),

):
    from ..umami.client import UmamiClient, UmamiError

    if not current_site.umami_website_id:
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
        realtime = client.get_realtime_sync(current_site.umami_website_id)

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
