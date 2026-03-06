from datetime import datetime, timezone
from .celery_app import celery
from .. import models, database

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

    finally:
        
        db.close()