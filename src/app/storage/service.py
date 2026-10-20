from pathlib import Path
from typing import Any
from uuid import uuid4
from dataclasses import dataclass
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..config import settings
from .. import models

ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

FAVICON_ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/x-icon"}
FAVICON_MAX_SIZE_BYTES = 1 * 1024 * 1024

_R2_CACHE_CONTROL = "public, max-age=31536000, immutable"

_MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/x-icon": (b"\x00\x00\x01\x00",),
}


def _verify_magic_bytes(data: bytes, content_type: str) -> bool:
    if content_type == "image/webp":
        return len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == "WEBP".encode("ascii")
    sigs = _MAGIC_BYTES.get(content_type)
    if sigs is None:
        return False
    return any(data.startswith(sig) for sig in sigs)


@dataclass
class StoredMedia:
    url: str
    storage_key: str
    mime_type: str
    size_bytes: int


class LocalStorageProvider:
    def save(self, data: bytes, storage_key: str, content_type: str = "") -> StoredMedia:
        abs_path = Path(settings.uploads_dir) / storage_key
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_bytes(data)

        return StoredMedia(
            url=f"{settings.public_base_url.rstrip('/')}/uploads/{storage_key}",
            storage_key=storage_key,
            mime_type=content_type,
            size_bytes=len(data),
        )

    def delete(self, storage_key: str) -> None:
        abs_path = Path(settings.uploads_dir) / storage_key
        if abs_path.exists():
            abs_path.unlink()


class R2StorageProvider:
    def __init__(self) -> None:
        if not all(
            [
                settings.r2_account_id,
                settings.r2_bucket_name,
                settings.r2_access_key_id,
                settings.r2_secret_access_key,
            ]
        ):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Missing R2 storage configuration",
            )

        try:
            import boto3
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="boto3 is required for R2 storage backend",
            ) from exc

        self.client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        self.bucket = settings.r2_bucket_name

    def save(self, data: bytes, storage_key: str, content_type: str = "") -> StoredMedia:
        put_kwargs: dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": storage_key,
            "Body": data,
            "CacheControl": _R2_CACHE_CONTROL,
        }
        if content_type:
            put_kwargs["ContentType"] = content_type
        self.client.put_object(**put_kwargs)
        base = settings.r2_public_base_url or ""
        url = f"{base.rstrip('/')}/{storage_key}" if base else storage_key
        return StoredMedia(
            url=url,
            storage_key=storage_key,
            mime_type=content_type,
            size_bytes=len(data),
        )

    def delete(self, storage_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=storage_key)


def _validate_image_upload(
    file: UploadFile,
    data: bytes,
    allowed_content_types: set[str] = ALLOWED_IMAGE_CONTENT_TYPES,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
    allowed_label: str = "Only jpg, png, and webp images are allowed",
) -> None:
    content_type = file.content_type or ""
    if content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=allowed_label,
        )
    if len(data) > max_size_bytes:
        max_mb = max(1, max_size_bytes // (1024 * 1024))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large (max {max_mb}MB)",
        )
    if not _verify_magic_bytes(data, content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match the claimed image type",
        )


def _ext_from_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/x-icon": ".ico",
    }.get(content_type, "")


def _get_storage_provider():
    backend = settings.storage_backend.lower()
    if backend == "r2":
        return R2StorageProvider()
    return LocalStorageProvider()


def get_user_storage_usage_bytes(db: Session, user_id: Any) -> int:
    user_site_ids = [
        row[0]
        for row in db.query(models.Site.site_id)
        .filter(models.Site.user_id == user_id)
        .all()
    ]
    if not user_site_ids:
        return 0

    blogs_total = (
        db.query(func.coalesce(func.sum(models.BlogMedia.size_bytes), 0))
        .filter(models.BlogMedia.site_id.in_(user_site_ids))
        .scalar()
    ) or 0
    pages_total = (
        db.query(func.coalesce(func.sum(models.PageMedia.size_bytes), 0))
        .filter(models.PageMedia.site_id.in_(user_site_ids))
        .scalar()
    ) or 0
    return int(blogs_total) + int(pages_total)


def build_storage_key(
    category: str,
    filename: str,
    *,
    user_id: Any | None = None,
    site_id: Any | None = None,
    entity_id: Any | None = None,
) -> str:
    """Build a canonical multi-tenant storage key.

    Site-scoped assets live under ``sites/{site_id}/{category}/...``;
    user-scoped avatars live under ``users/{user_id}/avatar/{filename}``.
    """
    if site_id is not None:
        if entity_id is not None:
            return f"sites/{site_id}/{category}/{entity_id}/{filename}"
        return f"sites/{site_id}/{category}/{filename}"

    if user_id is None:
        raise ValueError("build_storage_key requires either site_id or user_id")
    return f"users/{user_id}/avatar/{filename}"


async def save_media(
    file: UploadFile,
    category: str,
    *,
    user_id: Any | None = None,
    site_id: Any | None = None,
    entity_id: Any | None = None,
    allowed_content_types: set[str] = ALLOWED_IMAGE_CONTENT_TYPES,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
    allowed_label: str = "Only jpg, png, and webp images are allowed",
) -> StoredMedia:
    data = await file.read(max_size_bytes + 1)
    _validate_image_upload(
        file,
        data,
        allowed_content_types=allowed_content_types,
        max_size_bytes=max_size_bytes,
        allowed_label=allowed_label,
    )

    content_type = file.content_type or ""
    ext = _ext_from_content_type(content_type)
    filename = f"{uuid4().hex}{ext}"
    storage_key = build_storage_key(
        category,
        filename,
        user_id=user_id,
        site_id=site_id,
        entity_id=entity_id,
    )

    provider = _get_storage_provider()
    return provider.save(data=data, storage_key=storage_key, content_type=content_type)


async def save_favicon(
    file: UploadFile,
    *,
    site_id: Any,
) -> StoredMedia:
    return await save_media(
        file=file,
        category="favicons",
        site_id=site_id,
        allowed_content_types=FAVICON_ALLOWED_CONTENT_TYPES,
        max_size_bytes=FAVICON_MAX_SIZE_BYTES,
        allowed_label="Only png, jpg, webp, and ico images are allowed for favicons.",
    )


def delete_media(storage_key: str) -> None:
    if not storage_key:
        return
    provider = _get_storage_provider()
    provider.delete(storage_key)


def extract_storage_key_from_url(url: str | None) -> str | None:
    """Extract the bucket-relative storage_key from an owned R2 or local upload URL."""
    if not url or not isinstance(url, str):
        return None
    cleaned = url.strip()
    if not cleaned:
        return None
    if settings.default_profile_image_url and cleaned == settings.default_profile_image_url.strip():
        return None

    if "/cdn-cgi/image/" in cleaned:
        after_cdn = cleaned.split("/cdn-cgi/image/", 1)[1]
        parts = after_cdn.split("/", 1)
        if len(parts) == 2:
            key = parts[1].split("?", 1)[0].split("#", 1)[0].lstrip("/")
            return key or None

    r2_base = (settings.r2_public_base_url or "").strip().rstrip("/")
    if r2_base and cleaned.startswith(f"{r2_base}/"):
        key = cleaned[len(r2_base) + 1 :]
        key = key.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        return key or None

    local_base = f"{settings.public_base_url.strip().rstrip('/')}/uploads/"
    if cleaned.startswith(local_base):
        key = cleaned[len(local_base) :]
        key = key.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        return key or None

    return None


def matches_media_url(media: Any, url: str) -> bool:
    """True when ``url`` (raw or Cloudflare-transformed) refers to ``media``."""
    if not url:
        return False
    extracted_key = extract_storage_key_from_url(url)
    if extracted_key and media.storage_key == extracted_key:
        return True
    if media.storage_key and (
        url.endswith(f"/{media.storage_key}") or url == media.storage_key
    ):
        return True
    if media.url and (
        media.url == url or url.endswith(media.url) or media.url.endswith(url)
    ):
        return True
    return False


def media_referenced_in(media: Any, refs_blob: str) -> bool:
    if not refs_blob:
        return False
    if media.storage_key and media.storage_key in refs_blob:
        return True
    if media.url and media.url in refs_blob:
        return True
    return False


def reconcile_entity_media(
    db: Session,
    media_rows: list[Any],
    old_refs: str,
    new_refs: str,
    grace_seconds: int = 60,
) -> None:
    """Delete media rows (and their storage objects) no longer referenced after a save."""
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(seconds=grace_seconds)
    for media in media_rows:
        if media_referenced_in(media, new_refs):
            continue
        was_referenced = media_referenced_in(media, old_refs)
        created_at = getattr(media, "created_at", None)
        if created_at is not None and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        is_stale_unreferenced = created_at is not None and created_at < cutoff
        if was_referenced or is_stale_unreferenced:
            try:
                delete_media(media.storage_key)
            except Exception:
                pass
            db.delete(media)


def delete_media_by_url(url: str | None) -> None:
    """Best-effort delete of an owned storage object given its public URL."""
    key = extract_storage_key_from_url(url)
    if not key:
        return
    try:
        delete_media(key)
    except Exception:
        pass


async def save_image(
    file: UploadFile,
    category: str,
    *,
    user_id: Any | None = None,
    site_id: Any | None = None,
    entity_id: Any | None = None,
) -> str:
    stored = await save_media(
        file=file,
        category=category,
        user_id=user_id,
        site_id=site_id,
        entity_id=entity_id,
    )
    return stored.url