import re
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from .text import normalize_username


USERNAME_MIN_LEN = 3
USERNAME_MAX_LEN = 30
USERNAME_RE = re.compile(r"^[a-z0-9_-]+$")
USERNAME_CHANGE_LIMIT = 5
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
    db_user: models.User,
    new_username_raw: str,
    actor_user_id: Optional[int],
    actor_email: Optional[str],
    request_context: Optional[RequestContext],
    is_admin_override: bool = False,
    reason: Optional[str] = None,
) -> str:
    new_username = validate_username_or_raise(new_username_raw)
    old_username = normalize_username(db_user.user_name)
    if new_username == old_username:
        return old_username

    if db_user.username_change_count >= USERNAME_CHANGE_LIMIT and not is_admin_override:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username change limit reached ({USERNAME_CHANGE_LIMIT} lifetime changes).",
        )

    claim_username_or_raise(db, db_user.user_id, new_username)
    db_user.user_name = new_username
    db_user.username_change_count = (db_user.username_change_count or 0) + 1

    audit_username_change(
        db,
        user_id=db_user.user_id,
        old_username=old_username,
        new_username=new_username,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        is_admin_override=is_admin_override,
        reason=reason,
        request_context=request_context,
    )
    return new_username


def resolve_username_to_current(db: Session, requested_username_raw: str) -> tuple[models.User | None, str]:
    requested = normalize_username(requested_username_raw)
    if not requested:
        return None, ""

    db_user = db.query(models.User).filter(models.User.user_name == requested).first()
    if db_user:
        return db_user, normalize_username(db_user.user_name)

    claim = db.query(models.UsernameClaim).filter(models.UsernameClaim.username == requested).first()
    if not claim:
        return None, requested
    db_user = db.query(models.User).filter(models.User.user_id == claim.user_id).first()
    if not db_user:
        return None, requested
    return db_user, normalize_username(db_user.user_name)


def permanent_username_redirect(path: str, canonical_username: str, query_string: str = "") -> RedirectResponse:
    segments = path.split("/")
    if len(segments) > 1:
        segments[1] = canonical_username
    target = "/".join(segments) or f"/{canonical_username}"
    if query_string:
        target = f"{target}?{query_string}"
    return RedirectResponse(url=target, status_code=status.HTTP_301_MOVED_PERMANENTLY)
