from datetime import datetime, timezone
from .celery_app import celery
from .. import models, database
from ..email.service import send_new_post_email
from ..security.oauth2 import create_unsubscribe_token
from sqlalchemy import func


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
        
        existing_log = db.query(models.EmailLogs).filter(models.EmailLogs.blog_id == db_blog.blog_id, models.EmailLogs.user_id == db_user.user_id).first()

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
        
        blog_url = f"https://articurls.com/{db_user.user_name}/{db_blog.slug}"

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
            post.status = models.BlogStatus.PUBLISHED
            post.published_at = now
            
        db.commit()

        for post in db_posts:
            send_post_emails.delay(post.blog_id)

    finally:
        db.close()