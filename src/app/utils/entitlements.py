from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..security.oauth2 import get_current_user


def assert_pro(db: Session, user_id: int):

    db_subscription = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).first()

    if db_subscription and db_subscription.plan_type == "lifetime" and db_subscription.status in ("active", "past_due"):
        return db_subscription

    now = datetime.now(timezone.utc)

    if (
        not db_subscription
        or db_subscription.plan_type != "pro"
        or db_subscription.status not in ("active", "past_due", "cancelled")
        or db_subscription.current_period_end is None
        or db_subscription.current_period_end < now
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required",
        )

    return db_subscription


def require_pro(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    return assert_pro(db, current_user.user_id)


def is_pro_entitled(user: models.User, db: Session) -> bool:
    
    sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user.user_id).first()
    if not sub:
        return False
    if sub.plan_type == "lifetime" and sub.status in ("active", "past_due"):
        return True
    now = datetime.now(timezone.utc)
    return (
        sub.plan_type == "pro"
        and sub.status in ("active", "past_due", "cancelled")
        and sub.current_period_end is not None
        and sub.current_period_end >= now
    )
