import re
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import models
from .config import settings
from .database import get_db
from .domains import normalize_custom_domain
from .security.oauth2 import get_current_user

def make_excerpt(text: str, max_len: int = 160) -> str:
    if not text:
        return ""
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."


def make_seo_description(content: str, max_len: int = 160) -> str:
    if not content:
        return ""

    text = " ".join(content.split())

    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= max_len:
        return text

    cut = text[: max_len + 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]

    return cut.rstrip() + "..."


def assert_pro(db: Session, user_id: int):

    db_subscription = (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == user_id)
        .first()
    )

    now = datetime.now(timezone.utc)

    if (
        not db_subscription
        or db_subscription.plan_type != "pro"
        or db_subscription.status not in ("active", "past_due")
        or db_subscription.current_period_end is None
        or db_subscription.current_period_end < now
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required",
        )
        
    return db_subscription


def require_pro(current_user=Depends(get_current_user), db: Session = Depends(get_db)):

    return assert_pro(db, current_user.user_id)


def is_pro_entitled(user: models.User, db: Session) -> bool:

    now = datetime.now(timezone.utc)
    sub = (
        db.query(models.Subscriptions)
        .filter(models.Subscriptions.user_id == user.user_id)
        .first()
    )
    if not sub:
        return False
    return (
        sub.plan_type == "pro"
        and sub.status in ("active", "past_due")
        and sub.current_period_end is not None
        and sub.current_period_end >= now
    )


def public_post_url(user: models.User, blog: models.Blog, db: Session) -> str:

    if (
        is_pro_entitled(user, db)
        and user.is_domain_verified
        and normalize_custom_domain(user.custom_domain)
    ):
        host = normalize_custom_domain(user.custom_domain)
        return f"https://{host}/{blog.slug}"
    base = settings.public_base_url.rstrip("/")
    return f"{base}/{user.user_name}/blog/{blog.slug}"