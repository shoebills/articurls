from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..security.oauth2 import get_current_user


PLANS: dict[str, dict] = {
    "trial": {
        "label": "Trial",
        "has_time_limit": True,
        "valid_statuses": frozenset({"active"}),
    },
    "pro": {
        "label": "Pro",
        "has_time_limit": True,
        "valid_statuses": frozenset({"active", "past_due", "cancelled"}),
    },
    "lifetime": {
        "label": "Lifetime",
        "has_time_limit": False,
        "valid_statuses": frozenset({"active", "past_due"}),
    },
}


def is_pro_entitled(user_id: int, db: Session) -> bool:

    sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).first()
    if not sub:
        return False
    plan = PLANS.get(sub.plan_type)
    if not plan:
        return False
    if sub.status not in plan["valid_statuses"]:
        return False
    if plan.get("has_time_limit"):
        return sub.current_period_end is not None and sub.current_period_end >= datetime.now(timezone.utc)
    return True
