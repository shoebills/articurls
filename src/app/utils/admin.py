from fastapi import HTTPException, status

from ..config import settings


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    admins = {e.strip().lower() for e in (settings.admin_emails or "").split(",") if e.strip()}
    return email.strip().lower() in admins


def assert_admin_email(email: str | None) -> None:
    if not is_admin_email(email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
