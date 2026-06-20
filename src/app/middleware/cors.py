from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from ..config import settings
from ..redis_client import redis_client


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        response: Response = await call_next(request)

        if not origin:
            return response

        allowed = _is_origin_allowed(origin)

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            if request.method == "OPTIONS":
                response.headers["Access-Control-Allow-Methods"] = "*"
                response.headers["Access-Control-Allow-Headers"] = "*"

        return response


def _is_origin_allowed(origin: str) -> bool:
    parsed = urlparse(origin)

    if parsed.scheme not in ("http", "https"):
        return False

    hostname = parsed.hostname or ""

    static_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    for allowed in static_origins:
        allowed_host = urlparse(allowed).hostname or allowed
        if hostname == allowed_host:
            return True

    if parsed.scheme == "http":
        return False

    try:
        cached = redis_client.get(f"domain_lookup:{hostname}")
        if cached:
            return True
    except Exception:
        return False

    return False
