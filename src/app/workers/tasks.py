from typing import Any
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from .celery_app import celery
from .. import database, models
from ..config import settings
from ..domains.utils import expire_domain_access, start_domain_grace_period
from ..email.service import send_domain_grace_period_email, send_domain_expired_email
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_blog_home_url, public_post_url

logger = logging.getLogger(__name__)

# Unverified accounts are deleted 14 days after creation.
_UNVERIFIED_DELETE_AFTER_DAYS = 14


@celery.task
def publish_scheduled_blogs():

    db = database.SessionLocal()

    try:
        now = datetime.now(timezone.utc)
        
        db_posts = db.query(models.Blog).filter(models.Blog.status == models.BlogStatus.SCHEDULED, models.Blog.scheduled_at <= now).all()
        
        for post in db_posts:
            maybe_replace_placeholder_slug_on_publish(db, post)
            post.status = models.BlogStatus.PUBLISHED
            post.published_at = now
            # Publishing is a meaningful event — bump updated_at so sitemap
            # lastmod reflects when the post became publicly visible.
            post.updated_at = now

        db.commit()

    finally:
        db.close()

@celery.task
def expired_pro_fallback():

    db = database.SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # ── Expired Pro subscriptions ───────────────────────────────────────
        expired_subscriptions = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "pro",
            models.Subscriptions.status.in_(["active", "past_due", "cancelled"]),
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()
        
        for sub in expired_subscriptions:
            db_sites = db.query(models.Site).filter(models.Site.user_id == sub.user_id).all()
            for db_site in db_sites:
                if db_site.domain_status == models.DomainStatus.ACTIVE:
                    start_domain_grace_period(db_site, now=now)
                    db_user = db.query(models.User).filter(models.User.user_id == sub.user_id).first()
                    if db_user and db_site.custom_domain:
                        try:
                            grace_str = (
                                db_site.grace_expires_at.strftime("%B %d, %Y")
                                if db_site.grace_expires_at
                                else "14 days"
                            )
                            send_domain_grace_period_email(
                                db_user.email, db_user.name, db_site.custom_domain, grace_str
                            )
                        except Exception as e:
                            logger.error("Failed to send grace period email: %s", e)

            sub.status = "lapsed"

        # ── Grace-period expiry sweep ───────────────────────────────────────
        grace_expired_sites = db.query(models.Site).filter(
            models.Site.domain_status == models.DomainStatus.GRACE,
            models.Site.grace_expires_at.isnot(None),
            models.Site.grace_expires_at < now,
        ).all()

        for db_site in grace_expired_sites:
            expire_domain_access(db_site)
            db_user = db.query(models.User).filter(models.User.user_id == db_site.user_id).first()
            if db_user and db_site.custom_domain:
                try:
                    send_domain_expired_email(db_user.email, db_user.name, db_site.custom_domain)
                except Exception as e:
                    logger.error("Failed to send domain expired email: %s", e)

        db.commit()

    finally:
        db.close()


@celery.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def provision_umami_website(self, user_id: Any):
    """Create an Umami website for a user/site if not already provisioned."""
    from ..umami.client import UmamiClient
    from ..umami.service import provision_umami_website_for_user

    if not UmamiClient().configured:
        return

    db = database.SessionLocal()
    try:
        provision_umami_website_for_user(db, user_id)
    finally:
        db.close()


@celery.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def sync_umami_website_domain(self, user_id: Any):
    """Update Umami website domain when custom domain becomes active."""
    from ..umami.client import UmamiClient
    from ..umami.service import sync_umami_website_domain_for_user

    if not UmamiClient().configured:
        return

    db = database.SessionLocal()
    try:
        sync_umami_website_domain_for_user(db, user_id)
    finally:
        db.close()


@celery.task
def backfill_umami_websites():
    """Enqueue Umami provisioning for all sites missing umami_website_id."""
    from ..umami.client import UmamiClient

    if not UmamiClient().configured:
        return

    db = database.SessionLocal()
    try:
        rows = (
            db.query(models.Site.user_id)
            .filter(models.Site.umami_website_id.is_(None))
            .all()
        )
        for (user_id,) in rows:
            provision_umami_website.delay(str(user_id))
    finally:
        db.close()


def purge_user_account(db: Any, db_user: models.User) -> None:
    """Delete a user's external state (storage, Vercel, Umami, cache), then the user row.

    All DB children (sites, blogs, pages, subscribers, subscriptions, transactions,
    categories, authors, media rows) are removed by ON DELETE CASCADE. External
    objects with no DB row left behind must be cleaned first — see `delete_site`
    in src/app/routers/sites.py for the reference pattern.
    """
    from ..storage.service import delete_media, delete_media_by_url
    from ..umami.client import UmamiClient
    from ..cache.service import purge_tenant
    from ..domains.router import _remove_vercel_domain

    sites = db.query(models.Site).filter(models.Site.user_id == db_user.user_id).all()

    for site in sites:
        for media in db.query(models.BlogMedia).filter(models.BlogMedia.site_id == site.site_id).all():
            try:
                delete_media(media.storage_key)
            except Exception:
                pass
        for media in db.query(models.PageMedia).filter(models.PageMedia.site_id == site.site_id).all():
            try:
                delete_media(media.storage_key)
            except Exception:
                pass
        for author in db.query(models.Author).filter(models.Author.site_id == site.site_id).all():
            delete_media_by_url(author.profile_image_url)
        for branding_url in (site.logo_url, site.favicon_url, site.og_image_url):
            delete_media_by_url(branding_url)

        if site.custom_domain and not site.custom_subpath:
            try:
                asyncio.run(_remove_vercel_domain(site.custom_domain))
            except Exception:
                logger.warning(
                    "Vercel domain removal failed for %s", site.custom_domain, exc_info=True
                )

        if site.umami_website_id:
            try:
                client = UmamiClient()
                if client.configured:
                    client.delete_website_sync(str(site.umami_website_id))
            except Exception:
                logger.warning(
                    "Umami website deletion failed for %s", site.umami_website_id, exc_info=True
                )

        hosts = [h for h in (site.custom_domain, f"{site.subdomain}.{settings.ugc_domain}") if h]
        for host in hosts:
            try:
                asyncio.run(purge_tenant(host))
            except Exception:
                pass

    delete_media_by_url(db_user.profile_image_url)
    db.delete(db_user)
    db.commit()


@celery.task
def unverified_account_cleanup():
    """Delete accounts that never verified their email 14 days after sign-up."""

    db = database.SessionLocal()

    try:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=_UNVERIFIED_DELETE_AFTER_DAYS)

        stale_users = db.query(models.User).filter(
            models.User.email_verified == False,  # noqa: E712
            models.User.created_at.isnot(None),
            models.User.created_at < cutoff,
        ).all()

        for db_user in stale_users:
            logger.info("Deleting unverified account %s", db_user.user_id)
            purge_user_account(db, db_user)

    finally:
        db.close()


_QUOTA_EMAIL_TEMPLATE_NAMES = {
    "warning": ("traffic_warning_80_email", "warning80"),
    "over_limit": ("traffic_limit_100_email", "limit100"),
    "locked": ("traffic_locked_email", "locked"),
}


@celery.task
def check_traffic_quota_alerts():
    """Hourly sweep: send 80%/100%/locked traffic-quota emails once per month.

    Dedupes via Redis (per user+tier+stage); silently skips a send when Redis
    is unavailable rather than risking hourly duplicate emails. Spike months
    are recorded inside compute_account_usage so the yearly-plan
    two-consecutive-months lock can unlock correctly next month. Lifetime
    accounts are unlimited-traffic and are excluded by the Pro filter below.
    """

    from ..email import service as email_service
    from ..utils import traffic_quota as tq

    db = database.SessionLocal()

    try:
        db_subscriptions = (
            db.query(models.Subscriptions)
            .filter(
                models.Subscriptions.plan_type == "pro",
                models.Subscriptions.status == "active",
            )
            .all()
        )

        for db_sub in db_subscriptions:
            db_user = db.query(models.User).filter(models.User.user_id == db_sub.user_id).first()
            if not db_user or not db_user.email:
                continue

            try:
                usage = tq.compute_account_usage(db, db_user)
            except Exception:
                logger.exception("Traffic quota sweep failed for user %s", db_user.user_id)
                continue

            quota_status = usage["quota_status"]
            if quota_status not in _QUOTA_EMAIL_TEMPLATE_NAMES:
                continue

            tier_limit = usage["tier_limit"]
            if not tier_limit:
                continue

            sender_name, stage = _QUOTA_EMAIL_TEMPLATE_NAMES[quota_status]
            if not tq.claim_quota_email_slot(db_user.user_id, tier_limit, stage):
                continue

            try:
                sender = getattr(email_service, sender_name)
                sender(
                    db_user.email,
                    db_user.name,
                    usage["total_pageviews"],
                    tier_limit,
                )
            except Exception:
                logger.exception(
                    "Quota email send failed for user %s stage=%s", db_user.user_id, stage
                )

    finally:
        db.close()
