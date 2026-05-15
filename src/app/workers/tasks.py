from datetime import datetime, timezone
from sqlalchemy import func, text
from .celery_app import celery
from .. import database, models
from ..config import settings
from ..email.service import send_new_post_email, send_welcome_email as deliver_welcome_email
from ..email.welcome import render_welcome_email
from ..redis_client import redis_client
from ..security.oauth2 import create_unsubscribe_token
from ..utils import is_pro_entitled, maybe_replace_placeholder_slug_on_publish, public_blog_home_url, public_post_url


@celery.task
def record_blog_view(user_id: int, blog_id: int, visitor_hash: str):
    """
    Record a blog view in the database asynchronously and increment
    the Redis delta counter for the periodic flush to pick up.
    """
    db = database.SessionLocal()
    try:
        db.add(models.Views(
            user_id=user_id,
            blog_id=blog_id,
            visitor_hash=visitor_hash,
        ))
        db.commit()
    except Exception:
        pass
    finally:
        db.close()

    # Increment Redis delta — flush_view_counts will apply this to blogs.view_count
    try:
        redis_client.incr(f"views_delta:{blog_id}")
    except Exception:
        pass


@celery.task
def flush_view_counts():
    """
    Flush Redis view count deltas into the denormalized blogs.view_count column.
    Runs every 60 seconds via Celery beat.

    Uses GETSET(key, 0) for atomic swap — new INCRs after the swap are safe
    and will be picked up by the next flush cycle.
    """
    db = database.SessionLocal()
    try:
        for key in redis_client.scan_iter(match="views_delta:*", count=1000):
            try:
                blog_id = int(key.split(":")[-1])
            except (ValueError, IndexError):
                continue

            # Atomic: returns old value and resets to 0 in one operation
            delta = int(redis_client.getset(key, 0) or 0)

            if delta <= 0:
                continue

            result = db.execute(
                text("UPDATE blogs SET view_count = view_count + :delta WHERE blog_id = :blog_id"),
                {"delta": delta, "blog_id": blog_id},
            )

            # Blog was deleted — clean up the orphaned Redis key
            if result.rowcount == 0:
                redis_client.delete(key)

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


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

        if existing_log and existing_log.status == "sent":
            return

        db_subscribers = db.query(models.Subscriber).filter(models.Subscriber.user_id == db_user.user_id, models.Subscriber.unsubscribed_at.is_(None), models.Subscriber.is_confirmed == True).all()
        
        if not db_subscribers:
            return
        
        new_log = existing_log  # reuse failed log if present
        if new_log:
            new_log.total_recipients = len(db_subscribers)
            new_log.status = "pending"
            new_log.sent_at = None
        else:
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
def send_welcome_email(subscriber_id: int):
    db = database.SessionLocal()
    try:
        db_subscriber = (
            db.query(models.Subscriber)
            .filter(models.Subscriber.subscriber_id == subscriber_id)
            .first()
        )
        if not db_subscriber:
            return
        if db_subscriber.unsubscribed_at is not None:
            return
        if not db_subscriber.is_confirmed:
            return
        if db_subscriber.welcome_sent_at is not None:
            return

        db_user = db.query(models.User).filter(models.User.user_id == db_subscriber.user_id).first()
        if not db_user:
            return
        if not is_pro_entitled(db_user, db):
            return
        if not db_user.welcome_email_enabled:
            return

        unsubscribe_token = create_unsubscribe_token(db_subscriber.subscriber_id, db_user.user_id)
        unsubscribe_url = f"{settings.public_base_url.rstrip('/')}/unsubscribe?token={unsubscribe_token}"
        blog_url = public_blog_home_url(db_user)
        blog_name = db_user.name

        subject, html = render_welcome_email(
            blog_name=blog_name,
            blog_url=blog_url,
            unsubscribe_url=unsubscribe_url,
            custom_subject=db_user.welcome_email_subject,
            custom_body_html=db_user.welcome_email_body_html,
        )

        deliver_welcome_email(db_subscriber.email, subject, html)
        db_subscriber.welcome_sent_at = func.now()
        db.commit()
    except Exception:
        pass
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
        
        expired_subscriptions = db.query(models.Subscriptions).filter(
            models.Subscriptions.plan_type == "pro",
            models.Subscriptions.status != "active",
            models.Subscriptions.current_period_end.isnot(None),
            models.Subscriptions.current_period_end < now,
        ).all()
        
        for sub in expired_subscriptions:
            db_user = db.query(models.User).filter(models.User.user_id == sub.user_id).first()
            if db_user:
                # Handle custom domain lifecycle when Pro lapses
                if db_user.domain_status == models.DomainStatus.ACTIVE:
                    # Move to grace period — domain still serves for 30 days
                    from datetime import timedelta
                    db_user.domain_status = models.DomainStatus.GRACE
                    db_user.grace_started_at = now
                    db_user.grace_expires_at = now + timedelta(days=30)
                    # Invalidate Redis cache so middleware sees new status
                    try:
                        from .celery_app import celery as _celery
                        from ..redis_client import redis_client
                        if db_user.custom_domain:
                            redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
                    except Exception:
                        pass

                elif db_user.domain_status == models.DomainStatus.GRACE:
                    # Check if grace period has expired
                    if db_user.grace_expires_at and db_user.grace_expires_at < now:
                        db_user.domain_status = models.DomainStatus.EXPIRED
                        try:
                            from ..redis_client import redis_client
                            if db_user.custom_domain:
                                redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
                        except Exception:
                            pass

            sub.plan_type = "free"
            if sub.status != "cancelled":
                sub.status = "inactive"
            
        db.commit()

    finally:
        db.close()


@celery.task(bind=True, max_retries=8)
def poll_domain_ssl_records(self, user_id: int):
    """
    Poll Cloudflare until SSL validation records are available,
    then update the cached DNS instructions in the DB.

    Retries with exponential backoff: 3s, 6s, 12s, 24s, 48s, 96s, 192s, 384s
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
            return  # Already resolved

        cf_client = CloudflareClient()
        cf_result = cf_client.get_custom_hostname_sync(db_user.cloudflare_hostname_id)

        if not cf_result:
            # Use current retry count for backoff (not next, so first retry is 3s)
            raise self.retry(countdown=3 * (2 ** self.request.retries))

        hostname_status = cf_result.get("status")
        ssl_info = cf_result.get("ssl", {})
        ssl_status = ssl_info.get("status")

        # Domain fully active — update DB and stop
        if hostname_status == "active" and ssl_status == "active":
            db_user.domain_status = models.DomainStatus.ACTIVE
            db_user.is_domain_verified = True
            db_user.verified_at = datetime.now(timezone.utc)
            db_user.domain_dns_instructions = None
            db.commit()
            try:
                from ..redis_client import redis_client
                redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
            except Exception:
                pass
            return

        # Check if we have useful SSL records (either delegation CNAME or TXT records)
        dcv_delegation = ssl_info.get("dcv_delegation_records", [])
        validation_records = ssl_info.get("validation_records", [])
        has_ssl_records = bool(dcv_delegation) or len(validation_records) >= 2

        # Always update DB with latest records
        dns_instructions = extract_dns_instructions(cf_result, db_user.custom_domain)
        db_user.domain_dns_instructions = [r.model_dump() for r in dns_instructions]
        db.commit()

        # Keep retrying until we have complete SSL records
        if not has_ssl_records:
            raise self.retry(countdown=3 * (2 ** self.request.retries))

    except self.MaxRetriesExceededError:
        pass  # Give up — user can click verify to trigger a fresh check
    finally:
        db.close()
