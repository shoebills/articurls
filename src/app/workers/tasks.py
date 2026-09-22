from typing import Any
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from .celery_app import celery
from .. import database, models
from ..config import settings
from ..domains.utils import expire_domain_access, start_domain_grace_period
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_blog_home_url, public_post_url

logger = logging.getLogger(__name__)

# Trial expiry offsets for warning emails (days since period end), and hard
# limits: trial accounts are deleted 7 days after expiry, unverified accounts
# 14 days after creation.
_TRIAL_DELETE_AFTER_DAYS = 7
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

        # ── Expired trials ──────────────────────────────────────────────────
        expired_trials = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "trial",
            models.Subscriptions.status == "active",
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()

        for sub in expired_trials:
            db_sites = db.query(models.Site).filter(models.Site.user_id == sub.user_id).all()
            for db_site in db_sites:
                # Trial users get no grace — domain expires immediately
                if db_site.domain_status in (models.DomainStatus.ACTIVE, models.DomainStatus.GRACE):
                    expire_domain_access(db_site)
            sub.status = "inactive"

        # ── Expired Pro subscriptions ───────────────────────────────────────
        expired_subscriptions = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "pro",
            models.Subscriptions.status != "active",
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()
        
        for sub in expired_subscriptions:
            db_sites = db.query(models.Site).filter(models.Site.user_id == sub.user_id).all()
            for db_site in db_sites:
                if db_site.domain_status == models.DomainStatus.ACTIVE:
                    start_domain_grace_period(db_site, now=now)
                elif db_site.domain_status == models.DomainStatus.GRACE:
                    if db_site.grace_expires_at and db_site.grace_expires_at < now:
                        expire_domain_access(db_site)

            if sub.status != "cancelled":
                sub.status = "lapsed"

        # ── Grace-period expiry sweep ───────────────────────────────────────
        grace_expired_sites = db.query(models.Site).filter(
            models.Site.domain_status == models.DomainStatus.GRACE,
            models.Site.grace_expires_at.isnot(None),
            models.Site.grace_expires_at < now,
        ).all()

        for db_site in grace_expired_sites:
            expire_domain_access(db_site)

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
    from ..storage.service import delete_media
    from ..umami.client import UmamiClient
    from ..cache.service import purge_entire_tenant
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

        if site.custom_domain:
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
                asyncio.run(purge_entire_tenant(host))
            except Exception:
                pass

    db.delete(db_user)
    db.commit()


@celery.task
def trial_deletion_sweep():
    """Email expired-trial users at day 0/4/6 and hard-delete them at day 7."""

    from ..email.service import send_trial_expired_email, send_trial_deletion_warning_email

    db = database.SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        expired_trials = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "trial",
            models.Subscriptions.status == "inactive",
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()

        for sub in expired_trials:
            days_elapsed = (now - sub.current_period_end).days

            db_user = (
                db.query(models.User).filter(models.User.user_id == sub.user_id).first()
            )
            if not db_user:
                continue

            if days_elapsed >= _TRIAL_DELETE_AFTER_DAYS:
                logger.info("Hard-deleting account for trial user %s", db_user.user_id)
                purge_user_account(db, db_user)
                continue

            stage = sub.warning_stage or 0

            if stage < 1:
                try:
                    send_trial_expired_email(db_user.email, db_user.name)
                except Exception:
                    logger.warning(
                        "Trial expired email failed for %s", db_user.email, exc_info=True
                    )
                sub.warning_stage = 1
            elif stage < 2 and days_elapsed >= 4:
                try:
                    send_trial_deletion_warning_email(db_user.email, db_user.name, "3 days")
                except Exception:
                    logger.warning(
                        "Trial deletion warning email failed for %s", db_user.email, exc_info=True
                    )
                sub.warning_stage = 2
            elif stage < 3 and days_elapsed >= 6:
                try:
                    send_trial_deletion_warning_email(db_user.email, db_user.name, "24 hours")
                except Exception:
                    logger.warning(
                        "Trial deletion warning email failed for %s", db_user.email, exc_info=True
                    )
                sub.warning_stage = 3

        db.commit()

    finally:
        db.close()


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
