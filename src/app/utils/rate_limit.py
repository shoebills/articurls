from typing import Any
import hashlib
from fastapi import HTTPException, Request, status
from ..redis_client import redis_client
from .text import normalize_email


# Atomic Token Bucket script using Redis server time (TIME) to prevent worker clock drift.
# Stores state as a compact "<tokens>:<last_refill_ms>" string with automatic PX expiry
# once the bucket would be 100% refilled.
_TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local window_ms = tonumber(ARGV[3])

local t = redis.call('TIME')
local now_ms = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)

local refill_rate_per_ms = limit / window_ms

local raw = redis.call('GET', key)
local tokens = nil
local last_refill = nil

if raw then
    local sep = string.find(raw, ":")
    if sep then
        tokens = tonumber(string.sub(raw, 1, sep - 1))
        last_refill = tonumber(string.sub(raw, sep + 1))
    end
end

if tokens == nil or last_refill == nil then
    tokens = capacity
    last_refill = now_ms
else
    local elapsed_ms = math.max(0, now_ms - last_refill)
    tokens = math.min(capacity, tokens + elapsed_ms * refill_rate_per_ms)
    last_refill = now_ms
end

local allowed = 0
local retry_after_sec = 0

if tokens >= 1.0 then
    tokens = tokens - 1.0
    allowed = 1
else
    local needed = 1.0 - tokens
    retry_after_sec = math.max(1, math.ceil((needed / refill_rate_per_ms) / 1000.0))
end

local deficit = math.max(0.0, capacity - tokens)
local ttl_ms = math.max(1000, math.ceil((deficit / refill_rate_per_ms) + 1000))
redis.call('SET', key, tostring(tokens) .. ":" .. tostring(last_refill), 'PX', ttl_ms)

return { allowed, retry_after_sec }
"""

_token_bucket_script = redis_client.register_script(_TOKEN_BUCKET_LUA)


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _email_key(email: str) -> str:
    return hashlib.sha256(email.encode()).hexdigest()


def check_rate_limit(
    key_prefix: str,
    identifier: str,
    limit: int,
    window_seconds: int,
    burst: int | None = None,
) -> None:
    try:
        redis_key = f"rl:{key_prefix}:{identifier}"
        capacity = max(1, burst if burst is not None else limit)
        window_ms = max(1000, int(window_seconds * 1000))
        result = _token_bucket_script(
            keys=[redis_key],
            args=[capacity, max(1, limit), window_ms],
        )
        allowed = int(result[0])
        retry_after = int(result[1])
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
                headers={"Retry-After": str(max(1, retry_after))},
            )
    except HTTPException:
        raise
    except Exception:
        pass


def check_rate_limit_ip(
    request: Request,
    key_prefix: str,
    limit: int,
    window_seconds: int,
    burst: int | None = None,
) -> None:
    check_rate_limit(
        key_prefix,
        f"ip:{_client_ip(request)}",
        limit,
        window_seconds,
        burst=burst,
    )


def check_rate_limit_email(
    key_prefix: str,
    email: str,
    limit: int,
    window_seconds: int,
    burst: int | None = None,
) -> None:
    check_rate_limit(
        key_prefix,
        f"email:{_email_key(normalize_email(email))}",
        limit,
        window_seconds,
        burst=burst,
    )


def check_rate_limit_user(
    key_prefix: str,
    user_id: Any,
    limit: int,
    window_seconds: int,
    burst: int | None = None,
) -> None:
    check_rate_limit(
        key_prefix,
        f"user:{str(user_id)}",
        limit,
        window_seconds,
        burst=burst,
    )


def check_rate_limit_ip_and_email(
    request: Request,
    key_prefix: str,
    email: str,
    ip_limit: int,
    ip_window: int,
    email_limit: int,
    email_window: int,
    ip_burst: int | None = None,
    email_burst: int | None = None,
) -> None:
    check_rate_limit_ip(request, key_prefix, ip_limit, ip_window, burst=ip_burst)
    check_rate_limit_email(key_prefix, email, email_limit, email_window, burst=email_burst)
