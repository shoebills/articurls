from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..utils.entitlements import require_pro
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi.responses import StreamingResponse
from urllib.parse import urlparse
import io
import csv


router = APIRouter(
    tags=["Analytics"],
    prefix="/analytics"
)

PERIOD_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "28d": timedelta(days=28),
    "3m": timedelta(days=90),
    "6m": timedelta(days=180),
    "1y": timedelta(days=365),
}


def get_since(period: Optional[str]):
    if period is None:
        return None
    delta = PERIOD_MAP.get(period)
    if delta is None:
        return None
    return datetime.now(timezone.utc) - delta


def normalize_referrer_host(value: str) -> str:
    raw = value.strip().lower()
    if not raw:
        return ""

    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    host = parsed.netloc or parsed.path.split("/")[0]
    return host.lower().strip()


@router.get("/subscribers", status_code=status.HTTP_200_OK)
def subscribers_analytics(period: Optional[str] = "all", db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    current_subscribers = db.query(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.unsubscribed_at.is_(None), models.Subscriber.is_confirmed == True).scalar()

    since = get_since(period)

    sub_query = db.query(models.Subscriber).filter(models.Subscriber.user_id == current_user.user_id, models.Subscriber.is_confirmed == True)

    if since:
        subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.subscribed_at >= since).scalar()
        unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at >= since).scalar()
    else:
        subscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).scalar()
        unsubscribed = sub_query.with_entities(func.count(models.Subscriber.subscriber_id)).filter(models.Subscriber.unsubscribed_at.isnot(None)).scalar()

    return {
        "period": period,
        "current_subscribers": current_subscribers,
        "subscribed": subscribed,
        "unsubscribed": unsubscribed
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
            detail=f"Failed to retrieve analytics: {exc.body}",
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
        start_at, end_at = get_umami_period_timestamps(period)
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
            detail=f"Failed to retrieve analytics: {exc.body}",
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

        return {"period": period, "rows": pages}
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve analytics: {exc.body}",
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
            limit=limit,
        )
        internal_domains = umami_internal_domains()
        filtered_referrers = [
            row for row in referrers
            if normalize_referrer_host(str(row.get("x", ""))) not in internal_domains
        ]

        return {"period": period, "referrers": filtered_referrers}
    except UmamiError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve analytics: {exc.body}",
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
            detail=f"Failed to retrieve analytics: {exc.body}",
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
            detail=f"Failed to retrieve analytics: {exc.body}",
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
            detail=f"Failed to retrieve analytics: {exc.body}",
        )
