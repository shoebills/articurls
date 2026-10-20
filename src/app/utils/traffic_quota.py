"""Monthly traffic quota engine.

Traffic is Umami pageviews summed across all owned sites per UTC calendar
month; the allowance resets on the 1st for everyone, independent of billing
cycle. Public blogs are never restricted — ``quota_status`` only gates the
dashboard (writes return 402 once hard-locked).

Threshold rules (internal, never exposed to users — the API/UI never show the
1.2x lock buffer and ``usage_percentage`` is capped at 100.0):

- < 80%            -> ``ok``
- 80% .. < 100%    -> ``warning`` (amber banner + email)
- 100% .. < 120%   -> ``over_limit`` (red banner + email; dashboard still works)
- >= 120%          -> ``locked`` (dashboard overlay + 402 on writes/analytics)

Yearly plans get one silent grace month: crossing 120% stays ``over_limit``
while the previous month had no recorded spike; two consecutive months at or
above 120% lock. Month spikes are persisted in Redis per user/month. Lifetime
is a terminal unlimited-traffic plan (`tier_limit=None`) — same unbounded path
as ``pro_unlimited``; it never warns and never locks.
"""

from datetime import datetime, timezone
from typing import Any
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..payments.catalog import TIERS, TIER_KEYS
from ..database import get_db
from ..security.oauth2 import get_current_user

QUOTA_STATUS_OK = "ok"
QUOTA_STATUS_WARNING = "warning"
QUOTA_STATUS_OVER_LIMIT = "over_limit"
QUOTA_STATUS_LOCKED = "locked"

WARNING_RATIO = 0.8
LOCK_RATIO = 1.2  # Internal secret buffer — never send this over the wire.

_DEFAULT_MONTHLY_VIEWS = 10_000

# Spike flags persist 65 days so the previous calendar month is always
# consultable in the "two consecutive months" check; email dedup outlives the
# month window so a redelivery sweep cannot repeat a sent alert.
_SPIKE_FLAG_TTL_SECONDS = 65 * 86400
_EMAIL_DEDUP_TTL_SECONDS = 35 * 86400

_USAGE_VIEWS_CACHE_TTL = 300  # 5 minutes


def _redis_call(fn, *args, **kwargs):
    """Run a Redis call, swallowing outages (quota logic fails open/safe)."""
    from ..redis_client import redis_client

    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


def current_month_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def previous_month_key() -> str:
    now = datetime.now(timezone.utc)
    if now.month == 1:
        return f"{now.year - 1}-12"
    return f"{now.year}-{now.month - 1:02d}"


def _spike_flag_key(user_id: Any, month_key: str) -> str:
    # ugc/spike are internal bookkeeping keys; keep the prefix terse.
    return f"quota_spike:{user_id}:{month_key}"


def mark_spike_month(user_id: Any) -> None:
    """Record that this account crossed the internal lock threshold this month."""
    from ..redis_client import redis_client

    key = _spike_flag_key(user_id, current_month_key())
    _redis_call(redis_client.set, key, "1", ex=_SPIKE_FLAG_TTL_SECONDS)


def has_spike_flag(user_id: Any, month_key: str) -> bool:
    from ..redis_client import redis_client

    return bool(_redis_call(redis_client.exists, _spike_flag_key(user_id, month_key)))


def claim_quota_email_slot(user_id: Any, tier_limit: int, stage: str) -> bool:
    """Reserve the per-month email slot for user+tier+stage.

    Returns False when the slot was already claimed this month, or when Redis
    is unavailable (never email without dedupe — silent beats spammy).
    """
    from ..redis_client import redis_client

    key = _quota_email_dedupe_key(user_id, tier_limit, stage)
    claimed = _redis_call(redis_client.set, key, "1", nx=True, ex=_EMAIL_DEDUP_TTL_SECONDS)
    return bool(claimed)


def _quota_email_dedupe_key(user_id: Any, tier_limit: int, stage: str) -> str:
    from ..redis_client import redis_client

    return f"quota_email:{current_month_key()}:{user_id}:{tier_limit}:{stage}"


def compute_quota_status(
    tier_limit: int | None,
    ratio: float,
    is_yearly: bool,
    previous_month_spiked: bool,
) -> str:
    if tier_limit is None:
        return QUOTA_STATUS_OK
    if ratio < WARNING_RATIO:
        return QUOTA_STATUS_OK
    if ratio < 1.0:
        return QUOTA_STATUS_WARNING
    if ratio < LOCK_RATIO:
        return QUOTA_STATUS_OVER_LIMIT
    # At/over the internal lock threshold:
    if is_yearly and not previous_month_spiked:
        # First spike month on a yearly plan: silent grace, stay over_limit.
        return QUOTA_STATUS_OVER_LIMIT
    return QUOTA_STATUS_LOCKED


def recommended_tier_for_views(total_views: int) -> str | None:
    for key in TIER_KEYS:
        views = TIERS[key]["views"]
        if views is None or views > total_views:
            return key
    return "pro_unlimited"


def fetch_monthly_views_for_website(
    umami_client: Any,
    website_id: str,
    start_at: int,
    end_at: int,
    cache_key: str,
) -> int:
    """Fetch one site's month pageviews via Umami and cache the value."""
    from ..redis_client import redis_client

    try:
        stats = umami_client.get_website_stats_sync(website_id, start_at=start_at, end_at=end_at)
        views = max(0, int(stats.get("pageviews", 0) or 0))
    except Exception:
        return 0

    try:
        redis_client.setex(cache_key, _USAGE_VIEWS_CACHE_TTL, str(views))
    except Exception:
        pass

    return views


def collect_monthly_views(sites) -> dict[str, int]:
    """Sum current-month pageviews per site Umami website id (MGET + pool)."""
    from concurrent.futures import ThreadPoolExecutor

    from ..redis_client import redis_client
    from ..umami.client import UmamiClient
    from ..umami.service import get_umami_period_timestamps

    umami_client = UmamiClient()
    if not umami_client.configured:
        return {}

    start_at, end_at = get_umami_period_timestamps("this_month")
    month_key = current_month_key()

    cache_keys_by_wid: dict[str, str] = {}
    for site in sites:
        if site.umami_website_id:
            wid = str(site.umami_website_id)
            cache_keys_by_wid[wid] = f"umami_monthly_views:{month_key}:{wid}"

    if not cache_keys_by_wid:
        return {}

    views_by_wid: dict[str, int] = {}
    missing_wids: list[str] = []

    orders = list(cache_keys_by_wid.keys())
    try:
        cached_vals = redis_client.mget([cache_keys_by_wid[wid] for wid in orders])
    except Exception:
        cached_vals = None

    for idx, wid in enumerate(orders):
        raw_val = cached_vals[idx] if cached_vals and idx < len(cached_vals) else None
        if raw_val is not None:
            try:
                views_by_wid[wid] = max(0, int(raw_val))
                continue
            except (ValueError, TypeError):
                pass
        missing_wids.append(wid)

    if missing_wids:
        if len(missing_wids) == 1:
            wid = missing_wids[0]
            views_by_wid[wid] = fetch_monthly_views_for_website(
                umami_client, wid, start_at, end_at, cache_keys_by_wid[wid]
            )
        else:
            with ThreadPoolExecutor(max_workers=min(8, len(missing_wids))) as pool:
                futures = {
                    wid: pool.submit(
                        fetch_monthly_views_for_website,
                        umami_client,
                        wid,
                        start_at,
                        end_at,
                        cache_keys_by_wid[wid],
                    )
                    for wid in missing_wids
                }
                for wid, fut in futures.items():
                    try:
                        views_by_wid[wid] = fut.result()
                    except Exception:
                        views_by_wid[wid] = 0

    return views_by_wid


def compute_account_usage(db: Session, db_user: models.User) -> dict[str, Any]:
    """Full per-account usage payload shared by the API, Celery, and guards."""
    db_sub = (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == db_user.user_id)
        .first()
    )
    plan_type = db_sub.plan_type if db_sub else "pro"
    billing_cycle = db_sub.billing_cycle if db_sub and db_sub.billing_cycle else None
    tier_key = db_sub.tier if db_sub and db_sub.tier else None

    tier_limit: int | None
    price: int
    if plan_type == "lifetime":
        # Lifetime is a terminal plan with unlimited traffic — same path as
        # pro_unlimited (tier_limit=None -> always "ok", no recommendations).
        tier_limit = None
        price = 99
    elif tier_key in TIERS:
        tier_limit = TIERS[tier_key]["views"]
        cycle = billing_cycle or "monthly"
        price = TIERS[tier_key]["yearly"] if cycle == "yearly" else TIERS[tier_key]["monthly"]
    else:
        tier_limit = _DEFAULT_MONTHLY_VIEWS
        price = 19

    sites = db.query(models.Site).filter(models.Site.user_id == db_user.user_id).all()
    views_by_wid = collect_monthly_views(sites)

    site_items = []
    total_views = 0
    for site in sites:
        wid = str(site.umami_website_id) if site.umami_website_id else ""
        views = views_by_wid.get(wid, 0) if wid else 0
        total_views += views
        site_items.append(
            {
                "site_id": site.site_id,
                "subdomain": site.subdomain,
                "site_name": site.site_name or site.subdomain,
                "pageviews": views,
            }
        )

    ratio = (total_views / tier_limit) if tier_limit else 0.0
    is_yearly = plan_type == "pro" and billing_cycle == "yearly"
    previous_spiked = has_spike_flag(db_user.user_id, previous_month_key())
    quota_status = compute_quota_status(tier_limit, ratio, is_yearly, previous_spiked)

    if ratio >= LOCK_RATIO and tier_limit is not None:
        # Persist the spike for next month's two-consecutive-months check.
        mark_spike_month(db_user.user_id)

    if tier_limit is not None and tier_limit > 0:
        usage_percentage = min(100.0, round(ratio * 100, 1))
    else:
        usage_percentage = None

    return {
        "total_pageviews": total_views,
        "tier_limit": tier_limit,
        "plan_type": plan_type,
        "tier_price_usd": price,
        "billing_cycle": billing_cycle,
        "usage_percentage": usage_percentage,
        "quota_status": quota_status,
        "recommended_tier": (
            recommended_tier_for_views(total_views)
            if tier_limit is not None
            else None
        ),
        "sites": site_items,
    }


def require_within_traffic_quota(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Dependency: 402 once an account is hard-locked (dashboard writes/read-zoom)."""
    usage = compute_account_usage(db, current_user)
    if usage["quota_status"] == QUOTA_STATUS_LOCKED:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Monthly traffic limit exceeded. Upgrade your plan to restore dashboard access.",
        )
    return current_user
