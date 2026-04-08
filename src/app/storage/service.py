from pathlib import Path
from uuid import uuid4
from dataclasses import dataclass
from fastapi import UploadFile, HTTPException, status
from ..config import settings

ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024


@dataclass
class StoredMedia:
    url: str
    storage_key: str
    mime_type: str
    size_bytes: int
    media_type: str


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
            media_type="",
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
            media_type="",
        )

    def delete(self, storage_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=storage_key)


def _get_media_type(content_type: str) -> str:
    if content_type in ALLOWED_IMAGE_CONTENT_TYPES:
        return "image"
    if content_type in ALLOWED_VIDEO_CONTENT_TYPES:
        return "video"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only image(jpg/png/webp) or video(mp4/webm/mov) files are allowed",
    )


def _validate_upload(file: UploadFile, data: bytes) -> str:
    content_type = file.content_type or ""
    media_type = _get_media_type(content_type)
    if media_type == "image" and len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large (max 5MB)",
        )
    if media_type == "video" and len(data) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video too large (max 50MB)",
        )
    return media_type


def _ext_from_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }.get(content_type, "")


def _get_storage_provider():
    backend = settings.storage_backend.lower()
    if backend == "r2":
        return R2StorageProvider()
    return LocalStorageProvider()


async def save_media(file: UploadFile, category: str, user_id: int, blog_id: int | None = None) -> StoredMedia:
    data = await file.read()
    media_type = _validate_upload(file, data)

    ext = _ext_from_content_type(file.content_type or "")
    filename = f"{uuid4().hex}{ext}"
    if blog_id is not None:
        storage_key = f"{category}/{user_id}/{blog_id}/{filename}"
    else:
        storage_key = f"{category}/{user_id}/{filename}"

    provider = _get_storage_provider()
    stored = provider.save(data=data, storage_key=storage_key)
    stored.mime_type = file.content_type or ""
    stored.media_type = media_type
    return stored


def delete_media(storage_key: str) -> None:
    provider = _get_storage_provider()
    provider.delete(storage_key)


async def save_image_local(file: UploadFile, category: str, user_id: int) -> str:
    stored = await save_media(file=file, category=category, user_id=user_id)
    if stored.media_type != "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image uploads are allowed for this endpoint",
        )
    return stored.url