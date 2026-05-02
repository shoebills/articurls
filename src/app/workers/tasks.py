from datetime import datetime, timezone
from sqlalchemy import func
from .celery_app import celery
from .. import database, models
from ..email.service import send_new_post_email
from ..security.oauth2 import create_unsubscribe_token
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_post_url


@celery.task
def send_post_emails(blog_id: int):

    db = database.SessionLocal()
    new_log = None

    try:
        db_blog = db.query(models.Blog).filter(models.Blog.blog_id == blog_id).first()

        if not db_blog:
            return
        
        db_user = db.query(models.User).filter(models.User.user_id == db_blog.user_id).first()

        if not db_user:
            return
        
        if not db_blog.notify_subscribers:
            return

        if not is_pro_entitled(db_user, db):
            return

        existing_log = db.query(models.EmailLogs).filter(models.EmailLogs.blog_id == db_blog.blog_id, 
                                                         models.EmailLogs.user_id == db_user.user_id).first()

        if existing_log:
            return

        db_subscribers = db.query(models.Subscriber).filter(models.Subscriber.user_id == db_user.user_id, models.Subscriber.unsubscribed_at.is_(None), models.Subscriber.is_confirmed == True).all()
        
        if not db_subscribers:
            return
        
        new_log = models.EmailLogs(blog_id=db_blog.blog_id,
                                   user_id=db_user.user_id,
                                   total_recipients=len(db_subscribers),
                                   status="pending")
        
        db.add(new_log)
        db.commit()
        
        blog_url = public_post_url(db_user, db_blog, db)

        for sub in db_subscribers:
            try:
                unsubscribe_token = create_unsubscribe_token(sub.subscriber_id, db_user.user_id)
                send_new_post_email(sub.email, db_blog.title, blog_url, db_user.name, unsubscribe_token)
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
        
        expired_subscriptions = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "pro",
            models.Subscriptions.status != "active",
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()
        
        for sub in expired_subscriptions:
            db_user = db.query(models.User).filter(models.User.user_id == sub.user_id).first()
            if db_user:
                db_user.verification_tick = False

            sub.plan_type = "free"
            if sub.status != "cancelled":
                sub.status = "inactive"
            
        db.commit()

    finally:
        db.close()


@celery.task(bind=True, max_retries=8)
def poll_domain_ssl_records(self, user_id: int):
    """
    Poll Cloudflare until both SSL validation records (ECDSA + RSA) are available,
    then update the cached DNS instructions in the DB.
    
    Retries with exponential backoff: 3s, 6s, 12s, 24s, 48s, 96s, 192s, 384s (~10 min total)
    """
    from ..cloudflare.client import CloudflareClient
    from ..domains.router import extract_dns_instructions

    db = database.SessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
        if not db_user:
            return
        if not db_user.cloudflare_hostname_id:
            return
        if db_user.domain_status != models.DomainStatus.PENDING:
            return  # Already resolved, nothing to do

        cf_client = CloudflareClient()
        cf_result = cf_client.get_custom_hostname(db_user.cloudflare_hostname_id)

        if not cf_result:
            raise self.retry(countdown=3 * (2 ** self.request.retries))

        ssl_records = cf_result.get("ssl", {}).get("validation_records", [])
        hostname_status = cf_result.get("status")
        ssl_status = cf_result.get("ssl", {}).get("status")

        # Check if domain is now fully active
        if hostname_status == "active" and ssl_status == "active":
            db_user.domain_status = models.DomainStatus.ACTIVE
            db_user.is_domain_verified = True
            db_user.verified_at = datetime.now(timezone.utc)
            db_user.domain_dns_instructions = None
            db.commit()
            # Invalidate Redis cache
            try:
                from ..redis_client import redis_client
                import json as _json
                redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
            except Exception:
                pass
            return

        # Update DNS instructions with whatever records are available now
        dns_instructions = extract_dns_instructions(cf_result, db_user.custom_domain)
        db_user.domain_dns_instructions = [r.model_dump() for r in dns_instructions]
        db.commit()

        # If we don't have 2 SSL records yet, retry
        if len(ssl_records) < 2:
            raise self.retry(countdown=3 * (2 ** self.request.retries))

    except self.MaxRetriesExceededError:
        pass  # Give up — user can click verify to trigger a fresh check
    finally:
        db.close()
