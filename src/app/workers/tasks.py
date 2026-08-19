import logging
from datetime import datetime, timezone
from sqlalchemy import func
from .celery_app import celery
from .. import database, models
from ..config import settings
from ..domains.utils import expire_domain_access, start_domain_grace_period
from ..email.service import send_new_post_email
from ..security.oauth2 import create_unsubscribe_token
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_blog_home_url, public_post_url

logger = logging.getLogger(__name__)


@celery.task
def send_post_emails(blog_id: int):

    db = database.SessionLocal()
    new_log = None

    try:
        db_blog = db.query(models.Blog).filter(models.Blog.blog_id == blog_id).first()

        if not db_blog:
            return
        
        db_site = db.query(models.Site).filter(models.Site.site_id == db_blog.site_id).first()
        if not db_site:
            return

        db_user = db.query(models.User).filter(models.User.user_id == db_site.user_id).first()
        if not db_user:
            return
        
        if not db_blog.notify_subscribers:
            return

        if not is_pro_entitled(db_user.user_id, db):
            return

        existing_log = db.query(models.EmailLogs).filter(
            models.EmailLogs.blog_id == db_blog.blog_id, 
            models.EmailLogs.site_id == db_site.site_id
        ).first()

        if existing_log and existing_log.status == "sent":
            return

        db_subscribers = db.query(models.Subscriber).filter(
            models.Subscriber.site_id == db_site.site_id, 
            models.Subscriber.unsubscribed_at.is_(None), 
            models.Subscriber.is_confirmed == True
        ).all()
        
        if not db_subscribers:
            return
        
        new_log = existing_log  # reuse failed log if present
        if new_log:
            new_log.total_recipients = len(db_subscribers)
            new_log.status = "pending"
            new_log.sent_at = None
        else:
            new_log = models.EmailLogs(
                blog_id=db_blog.blog_id,
                site_id=db_site.site_id,
                total_recipients=len(db_subscribers),
                status="pending"
            )
            db.add(new_log)
        db.commit()
        
        blog_url = public_post_url(db_site, db_blog, db)
        author_name = db_site.authors[0].name if db_site.authors else db_user.name

        for sub in db_subscribers:
            try:
                unsubscribe_token = create_unsubscribe_token(sub.subscriber_id, db_site.site_id)
                send_new_post_email(sub.email, db_blog.title, blog_url, author_name, unsubscribe_token)
            except Exception:
                pass

        new_log.status = "sent"
        new_log.sent_at = func.now()
        db.commit()

    except Exception:
        try:
            if new_log:
                new_log.status = "failed"
                db.commit()
        except Exception:
            return

    finally:
        db.close()

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

        for post in db_posts:
            send_post_emails.delay(post.blog_id)

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

            sub.plan_type = "lapsed"
            if sub.status != "cancelled":
                sub.status = "inactive"

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
def provision_umami_website(self, user_id: int):
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
def sync_umami_website_domain(self, user_id: int):
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
            provision_umami_website.delay(user_id)
    finally:
        db.close()
