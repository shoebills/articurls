from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery = Celery(
    "articals",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery.conf.timezone = "UTC"
celery.conf.enable_utc = True
celery.conf.beat_schedule = {
    "publish-scheduled-blogs":{
        "task": "src.app.workers.tasks.publish_scheduled_blogs",
        "schedule": crontab(minute="*"),
    }
}