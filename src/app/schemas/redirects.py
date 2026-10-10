from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from urllib.parse import urlparse
from datetime import datetime
import uuid


# Paths that never reach the content renderer (app routes / framework
# internals) — a redirect on them would silently never fire.
BLOCKED_SOURCE_PATHS = frozenset({
    "/_next",
    "/api",
    "/dashboard",
    "/login",
    "/signup",
    "/setup",
    "/internal",
    "/site",
    "/custom-domain",
})

RedirectTypeValue = Literal["permanent", "temporary"]
RedirectOriginValue = Literal["manual", "automatic"]


def normalize_source_path(raw: str) -> str:
    path = raw.strip()
    if not path.startswith("/"):
        raise ValueError("Source must be a path starting with '/'.")
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
        if not path:
            path = "/"
    if len(path) > 300:
        raise ValueError("Source path is too long (max 300 characters).")
    lowered = path.lower()
    for blocked in BLOCKED_SOURCE_PATHS:
        if lowered == blocked or lowered.startswith(blocked + "/"):
            raise ValueError(f"Source path '{blocked}' is a reserved app path.")
    return path


def normalize_target_url(raw: str) -> str:
    url = raw.strip()
    if not url:
        raise ValueError("Target is required.")
    if len(url) > 2000:
        raise ValueError("Target URL is too long (max 2000 characters).")
    if url.startswith("//"):
        raise ValueError("Target must be a relative path ('/...') or an absolute http(s) URL.")
    if url.startswith("/"):
        return url
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Target must be a relative path ('/...') or an absolute http(s) URL.")
    return url


class RedirectOut(BaseModel):
    redirect_id: uuid.UUID
    source_path: str
    target_url: str
    type: RedirectTypeValue
    origin: RedirectOriginValue = "manual"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RedirectCreate(BaseModel):
    source_path: str = Field(..., min_length=1, max_length=300)
    target_url: str = Field(..., min_length=1, max_length=2000)
    type: RedirectTypeValue = "permanent"

    @field_validator("source_path")
    @classmethod
    def _validate_source(cls, v):
        return normalize_source_path(v)

    @field_validator("target_url")
    @classmethod
    def _validate_target(cls, v):
        return normalize_target_url(v)


class RedirectUpdate(BaseModel):
    source_path: Optional[str] = Field(None, min_length=1, max_length=300)
    target_url: Optional[str] = Field(None, min_length=1, max_length=2000)
    type: Optional[RedirectTypeValue] = None

    @field_validator("source_path")
    @classmethod
    def _validate_source(cls, v):
        if v is None:
            return v
        return normalize_source_path(v)

    @field_validator("target_url")
    @classmethod
    def _validate_target(cls, v):
        if v is None:
            return v
        return normalize_target_url(v)
