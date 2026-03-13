from datetime import datetime, timezone
from .celery_app import celery
from .. import models, database
from ..email.service import send_new_post_email
from ..security.oauth2 import create_unsubscribe_token


@celery.task
def send_post_emails(blog_id: int):

    db = database.SessionLocal()

    try:
        blog = db.query(models.Blog).filter(models.Blog.blog_id == blog_id).first()

        if not blog:
            return
        
        user = db.query(models.User).filter(models.User.user_id == blog.user_id).first()

        if not user:
            return

        subscribers = db.query(models.Subscriber).filter(models.Subscriber.user_id == user.user_id, models.Subscriber.unsubscribed_at.is_(None)).all()
        
        blog_url = f"https://articals.io/{user.user_name}/{blog.slug}"

        for sub in subscribers:
            try:
                unsubscribe_token = create_unsubscribe_token(sub.subscriber_id, user.user_id)
                send_new_post_email(sub.email, blog.title, blog_url, user.name, unsubscribe_token)
            except Exception:
                pass

    finally:
        db.close()

@celery.task
def publish_scheduled_blogs():

    db = database.SessionLocal()

    try:
        now = datetime.now(timezone.utc)
        
        posts = db.query(models.Blog).filter(models.Blog.status == models.BlogStatus.SCHEDULED, models.Blog.scheduled_at <= now).all()
        
        for post in posts:
            post.status = models.BlogStatus.PUBLISHED
            post.published_at = now
            
        db.commit()

        for post in posts:
            send_post_emails.delay(post.blog_id)

    finally:
        db.close()