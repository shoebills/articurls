from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .. import models
from ..utils import is_pro_entitled
from ..workers.tasks import send_welcome_email


def schedule_welcome_email_after_confirm(db: Session, subscriber: models.Subscriber) -> None:
    db_user = db.query(models.User).filter(models.User.user_id == subscriber.user_id).first()
    if not db_user:
        return
    if not is_pro_entitled(db_user, db):
        return
    if not db_user.welcome_email_enabled:
        return

    delay_minutes = max(0, int(db_user.welcome_email_delay_minutes or 0))
    eta = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
    send_welcome_email.apply_async(args=[subscriber.subscriber_id], eta=eta)
