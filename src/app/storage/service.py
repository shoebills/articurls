from pathlib import Path
from uuid import uuid4
from fastapi import UploadFile, HTTPException, status
from ..config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


def _validate_upload(file: UploadFile, data: bytes) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, png, webp images are allowed",
        )
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large (max 5MB)",
        )


def _ext_from_content_type(content_type: str) -> str:
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(content_type, "")


async def save_image_local(file: UploadFile, category: str, owner_id: int) -> str:
    data = await file.read()
    _validate_upload(file, data)

    ext = _ext_from_content_type(file.content_type or "")
    filename = f"{uuid4().hex}{ext}"

    relative_dir = Path(category) / str(owner_id)
    abs_dir = Path(settings.uploads_dir) / relative_dir
    abs_dir.mkdir(parents=True, exist_ok=True)

    abs_path = abs_dir / filename
    abs_path.write_bytes(data)

    return f"{settings.public_base_url}/uploads/{relative_dir.as_posix()}/{filename}"