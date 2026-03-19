from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery = Celery(
    "articurls",
    broker=settings.redis_url,
    backend=settings.redis_url
)

celery.conf.task_ignore_result = True

celery.conf.timezone = "UTC"
celery.conf.enable_utc = True

celery.conf.beat_scheduler = "redbeat.RedBeatScheduler"
celery.conf.redbeat_redis_url = settings.redis_url

celery.autodiscover_tasks(["src.app.workers"])

celery.conf.beat_schedule = {
    "publish-scheduled-blogs":{
        "task": "src.app.workers.tasks.publish_scheduled_blogs",
        "schedule": crontab(minute="*"),
    }
}