from typing import Any
import logging
from datetime import datetime, timezone
from sqlalchemy import func
from .celery_app import celery
from .. import database, models
from ..config import settings
from ..domains.utils import expire_domain_access, start_domain_grace_period
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_blog_home_url, public_post_url

logger = logging.getLogger(__name__)


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
