import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from .text import normalize_username


USERNAME_MIN_LEN = 3
USERNAME_MAX_LEN = 30
USERNAME_RE = re.compile(r"^[a-z0-9_-]+$")
USERNAME_CHANGE_COOLDOWN_DAYS = 7
RESERVED_USERNAMES = {
    "login",
    "signup",
    "verify",
    "dashboard",
    "analytics",
    "billing",
    "settings",
    "forgot-password",
    "reset-password",
    "api",
    "_next",
    "favicon.ico",
}


@dataclass
class RequestContext:
    ip: Optional[str] = None
    user_agent: Optional[str] = None


def validate_username_or_raise(raw: str | None) -> str:
    value = normalize_username(raw)
    if not value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Username is required")
    if len(value) < USERNAME_MIN_LEN or len(value) > USERNAME_MAX_LEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Username must be {USERNAME_MIN_LEN}-{USERNAME_MAX_LEN} characters.",
        )
    if not USERNAME_RE.fullmatch(value):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username may only contain lowercase letters, numbers, underscore, and hyphen.",
        )
    if value in RESERVED_USERNAMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is reserved.")
    return value


def claim_username_or_raise(db: Session, user_id: int, username: str) -> None:
    existing = db.query(models.UsernameClaim).filter(models.UsernameClaim.username == username).first()
    if existing and existing.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    if not existing:
        db.add(models.UsernameClaim(user_id=user_id, username=username))


def audit_username_change(
    db: Session,
    *,
    user_id: int,
    old_username: str,
    new_username: str,
    actor_user_id: Optional[int],
    actor_email: Optional[str],
    is_admin_override: bool,
    reason: Optional[str],
    request_context: Optional[RequestContext],
) -> None:
    db.add(
        models.UsernameChangeAudit(
            user_id=user_id,
            old_username=old_username,
            new_username=new_username,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            is_admin_override=is_admin_override,
            reason=reason,
            request_ip=request_context.ip if request_context else None,
            user_agent=request_context.user_agent if request_context else None,
        )
    )


def apply_username_change_or_raise(
    db: Session,
    *,
    db_site: models.Site,
    new_username_raw: str,
    actor_user_id: Optional[int],
    actor_email: Optional[str],
    request_context: Optional[RequestContext],
    is_admin_override: bool = False,
    reason: Optional[str] = None,
) -> str:
    new_username = validate_username_or_raise(new_username_raw)
    old_username = normalize_username(db_site.subdomain)
    if new_username == old_username:
        return old_username

    if db_site.last_username_change_at and not is_admin_override:
        elapsed = datetime.now(timezone.utc) - db_site.last_username_change_at
        if elapsed < timedelta(days=USERNAME_CHANGE_COOLDOWN_DAYS):
            remaining_days = USERNAME_CHANGE_COOLDOWN_DAYS - elapsed.days
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining_days} day(s) before changing again.",
            )

    claim_username_or_raise(db, db_site.user_id, new_username)
    db_site.subdomain = new_username
    db_site.last_username_change_at = datetime.now(timezone.utc)

    audit_username_change(
        db,
        user_id=db_site.user_id,
        old_username=old_username,
        new_username=new_username,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        is_admin_override=is_admin_override,
        reason=reason,
        request_context=request_context,
    )
    return new_username


def resolve_username_to_current(db: Session, requested_username_raw: str) -> tuple[models.Site | None, str]:
    requested = normalize_username(requested_username_raw)
    if not requested:
        return None, ""

    db_site = db.query(models.Site).filter(models.Site.subdomain == requested).first()
    if db_site:
        return db_site, normalize_username(db_site.subdomain)

    # For now, if not found, we don't do claim-based redirect to avoid multiple site ambiguity
    return None, requested


def permanent_username_redirect(path: str, canonical_username: str, query_string: str = "") -> RedirectResponse:
    segments = path.split("/")
    if len(segments) > 1:
        segments[1] = canonical_username
    target = "/".join(segments) or f"/{canonical_username}"
    if query_string:
        target = f"{target}?{query_string}"
    return RedirectResponse(url=target, status_code=status.HTTP_301_MOVED_PERMANENTLY)
