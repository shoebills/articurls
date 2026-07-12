from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from ..config import settings
from ..redis_client import redis_client


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")

        if request.method == "OPTIONS" and origin:
            return self._preflight_response(origin, request)

        response: Response = await call_next(request)

        if origin and _is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"

        return response

    def _preflight_response(self, origin: str, request: Request) -> Response:
        if not _is_origin_allowed(origin):
            return Response(status_code=200)

        request_method = request.headers.get("access-control-request-method", "")
        request_headers = request.headers.get("access-control-request-headers", "")

        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": request_method or "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": request_headers or "authorization, content-type",
        }
        return Response(status_code=200, headers=headers)


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
