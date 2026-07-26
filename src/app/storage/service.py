from pathlib import Path
from uuid import uuid4
from dataclasses import dataclass
from fastapi import UploadFile, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..config import settings
from .. import models
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

_MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "image/x-icon": (b"\x00\x00\x01\x00",),
}


def _verify_magic_bytes(data: bytes, content_type: str) -> bool:
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
    def save(self, data: bytes, storage_key: str) -> StoredMedia:
        abs_path = Path(settings.uploads_dir) / storage_key
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_bytes(data)

        return StoredMedia(
            url=f"{settings.public_base_url}/uploads/{storage_key}",
            storage_key=storage_key,
            mime_type="",
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

    def save(self, data: bytes, storage_key: str) -> StoredMedia:
        self.client.put_object(Bucket=self.bucket, Key=storage_key, Body=data)
        base = settings.r2_public_base_url or ""
        url = f"{base.rstrip('/')}/{storage_key}" if base else storage_key
        return StoredMedia(
            url=url,
            storage_key=storage_key,
            mime_type="",
            size_bytes=len(data),
        )

    def delete(self, storage_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=storage_key)


def _validate_image_upload(file: UploadFile, data: bytes) -> None:
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, png, and webp images are allowed",
        )
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large (max 2MB)",
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
    }.get(content_type, "")


def _get_storage_provider():
    backend = settings.storage_backend.lower()
    if backend == "r2":
        return R2StorageProvider()
    return LocalStorageProvider()


def get_user_storage_usage_bytes(db: Session, user_id: int) -> int:
    blogs_total = (
        db.query(func.coalesce(func.sum(models.BlogMedia.size_bytes), 0))
        .filter(models.BlogMedia.user_id == user_id)
        .scalar()
    ) or 0
    pages_total = (
        db.query(func.coalesce(func.sum(models.PageMedia.size_bytes), 0))
        .filter(models.PageMedia.user_id == user_id)
        .scalar()
    ) or 0
    return int(blogs_total) + int(pages_total)


async def save_media(
    file: UploadFile,
    category: str,
    user_id: int,
    blog_id: int | None = None,
    db: Session | None = None,
) -> StoredMedia:
    data = await file.read()
    _validate_image_upload(file, data)

    ext = _ext_from_content_type(file.content_type or "")
    filename = f"{uuid4().hex}{ext}"
    if blog_id is not None:
        storage_key = f"{category}/{user_id}/{blog_id}/{filename}"
    else:
        storage_key = f"{category}/{user_id}/{filename}"

    provider = _get_storage_provider()
    stored = provider.save(data=data, storage_key=storage_key)
    stored.mime_type = file.content_type or ""
    return stored


def delete_media(storage_key: str) -> None:
    provider = _get_storage_provider()
    provider.delete(storage_key)


async def save_image_local(file: UploadFile, category: str, user_id: int, db: Session | None = None) -> str:
    stored = await save_media(file=file, category=category, user_id=user_id, db=db)
    return stored.url