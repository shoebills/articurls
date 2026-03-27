import re
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import models
from .security.oauth2 import get_current_user
from .database import get_db

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


def require_pro(current_user = Depends(get_current_user), db: Session = Depends(get_db)):

    db_subscription = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()

    if not db_subscription or db_subscription.plan_type != "pro" or db_subscription.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro plan required",
        )
    
    return db_subscription