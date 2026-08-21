from typing import Any
import hashlib
from fastapi import HTTPException, Request, status
from ..redis_client import redis_client
from .text import normalize_email


def _client_ip(request: Request) -> str:
    return (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else None)
        or ""
    )


def _email_key(email: str) -> str:
    return hashlib.sha256(email.encode()).hexdigest()


def check_rate_limit(key_prefix: str, identifier: str, limit: int, window_seconds: int) -> None:
    try:
        redis_key = f"rl:{key_prefix}:{identifier}"
        count = redis_client.incr(redis_key)
        if count == 1:
            redis_client.expire(redis_key, window_seconds)
        if count > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
            )
    except HTTPException:
        raise
    except Exception:
        pass


def check_rate_limit_ip(request: Request, key_prefix: str, limit: int, window_seconds: int) -> None:
    check_rate_limit(key_prefix, f"ip:{_client_ip(request)}", limit, window_seconds)


def check_rate_limit_email(key_prefix: str, email: str, limit: int, window_seconds: int) -> None:
    check_rate_limit(key_prefix, f"email:{_email_key(normalize_email(email))}", limit, window_seconds)


def check_rate_limit_user(key_prefix: str, user_id: Any, limit: int, window_seconds: int) -> None:
    check_rate_limit(key_prefix, f"user:{str(user_id)}", limit, window_seconds)


def check_rate_limit_ip_and_email(
    request: Request,
    key_prefix: str,
    email: str,
    ip_limit: int,
    ip_window: int,
    email_limit: int,
    email_window: int,
) -> None:
    check_rate_limit_ip(request, key_prefix, ip_limit, ip_window)
    check_rate_limit_email(key_prefix, email, email_limit, email_window)
