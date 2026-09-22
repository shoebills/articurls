from celery import Celery
from celery.schedules import crontab
from ..config import settings

celery = Celery(
    "articurls",
    broker=settings.redis_url,
)

celery.conf.task_ignore_result = True

celery.conf.timezone = "UTC"
celery.conf.enable_utc = True

celery.conf.beat_scheduler = "redbeat.RedBeatScheduler"
celery.conf.redbeat_redis_url = settings.redis_url

celery.autodiscover_tasks(["src.app.workers"])

celery.conf.beat_schedule = {
    "publish-scheduled-blogs": {
        "task": "src.app.workers.tasks.publish_scheduled_blogs",
        "schedule": crontab(minute="*"),
    },

    "expired-pro-fallback": {
        "task": "src.app.workers.tasks.expired_pro_fallback",
        "schedule": crontab(minute=0),
    },

    "trial-deletion-sweep": {
        "task": "src.app.workers.tasks.trial_deletion_sweep",
        "schedule": crontab(minute=0),
    },

    "unverified-account-cleanup": {
        "task": "src.app.workers.tasks.unverified_account_cleanup",
        "schedule": crontab(minute=0),
    },
}