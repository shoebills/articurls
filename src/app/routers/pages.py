from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify
from datetime import datetime, timezone
import secrets
from .. import models
from ..database import get_db
from ..schemas import page as page_schema
from ..security import oauth2
from ..storage.service import delete_media, save_media

router = APIRouter(
    tags=["Pages"],
    prefix="/pages",
)


@router.post("/{page_id:int}/media", response_model=page_schema.PageMediaOut, status_code=status.HTTP_201_CREATED)
async def upload_page_media(
    page_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file is required")

    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    stored = await save_media(
        file=file,
        category="pages",
        user_id=current_user.user_id,
        blog_id=db_page.page_id,
        db=db,
    )

    max_sort_order = (
        db.query(func.max(models.PageMedia.sort_order))
        .filter(models.PageMedia.page_id == db_page.page_id)
        .scalar()
    )
    next_sort_order = (max_sort_order or 0) + 1

    new_media = models.PageMedia(
        page_id=db_page.page_id,
        user_id=current_user.user_id,
        url=stored.url,
        storage_key=stored.storage_key,
        mime_type=stored.mime_type,
        size_bytes=stored.size_bytes,
        sort_order=next_sort_order,
    )
    db.add(new_media)
    db.commit()
    db.refresh(new_media)
    return new_media


@router.delete("/{page_id:int}/media/{media_id:int}", status_code=status.HTTP_200_OK)
def delete_page_media(
    page_id: int,
    media_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    db_media = (
        db.query(models.PageMedia)
        .filter(
            models.PageMedia.media_id == media_id,
            models.PageMedia.page_id == db_page.page_id,
            models.PageMedia.user_id == current_user.user_id,
        )
        .first()
    )
    if not db_media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media with id: {media_id} not found")

    delete_media(db_media.storage_key)
    db.delete(db_media)
    db.commit()
    return {"message": "Media deleted"}


@router.delete("/{page_id:int}/media", status_code=status.HTTP_200_OK)
def delete_page_media_by_url(
    page_id: int,
    url: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    db_media = (
        db.query(models.PageMedia)
        .filter(
            models.PageMedia.page_id == db_page.page_id,
            models.PageMedia.user_id == current_user.user_id,
        )
        .all()
    )
    target = next(
        (
            m
            for m in db_media
            if m.url == url or url.endswith(m.url) or m.url.endswith(url)
        ),
        None,
    )
    if not target:
        return {"message": "Media not found (already removed or external URL)"}

    delete_media(target.storage_key)
    db.delete(target)
    db.commit()
    return {"message": "Media deleted"}


def _unique_page_slug(db: Session, user_id: int, title: str) -> str:
    base = slugify(title) or "page"
    candidate = base
    idx = 2
    while (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == user_id, models.UserPage.slug == candidate)
        .first()
        is not None
    ):
        candidate = f"{base}-{idx}"
        idx += 1
    return candidate


def _validate_publishable_page(db_page: models.UserPage) -> None:
    title = (db_page.title or "").strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title is required to publish",
        )

    import re

    content_text = re.sub(r"<[^>]+>", "", db_page.content or "").strip()
    if not content_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content is required to publish",
        )


@router.get("/", response_model=list[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def list_pages(
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    return (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == current_user.user_id)
        .order_by(models.UserPage.created_at.asc())
        .all()
    )


@router.post("/", response_model=page_schema.UserPageOut, status_code=status.HTTP_201_CREATED)
def create_page(
    request: page_schema.UserPageCreate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    title = (request.title or "").strip()
    content = request.content or ""
    base_slug = slugify(title) if title else f"draft-{secrets.token_hex(6)}"

    new_page = models.UserPage(
        user_id=current_user.user_id,
        title=title,
        content=content,
        slug=_unique_page_slug(db, current_user.user_id, base_slug),
        status=models.PageStatus.DRAFT,
    )
    db.add(new_page)
    db.commit()
    db.refresh(new_page)
    return new_page


@router.delete("/{page_id:int}", status_code=status.HTTP_200_OK)
def delete_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    media_rows = (
        db.query(models.PageMedia)
        .filter(
            models.PageMedia.page_id == db_page.page_id,
            models.PageMedia.user_id == current_user.user_id,
        )
        .all()
    )
    for media in media_rows:
        try:
            delete_media(media.storage_key)
        except Exception:
            pass

    db.delete(db_page)
    db.commit()
    return {"message": "Page deleted"}


@router.patch("/id/{page_id:int}", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def update_page(
    page_id: int,
    request: page_schema.UserPageUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    update_data = request.model_dump(exclude_unset=True)

    if "title" in update_data:
        db_page.title = (update_data["title"] or "").strip()

    if "content" in update_data:
        db_page.content = update_data["content"] or ""

    if "slug" in update_data:
        new_slug = (update_data["slug"] or "").strip()
        if new_slug and new_slug != db_page.slug:
            if db_page.published_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change the URL slug after the page is published.",
                )
            # Validate slug format
            from slugify import slugify as _slugify
            normalized = _slugify(new_slug) or ""
            if not normalized:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid slug")
            # Check uniqueness
            conflict = (
                db.query(models.UserPage)
                .filter(
                    models.UserPage.user_id == current_user.user_id,
                    models.UserPage.slug == normalized,
                    models.UserPage.page_id != page_id,
                )
                .first()
            )
            if conflict:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use by another page")
            db_page.slug = normalized

    if "meta_title" in update_data:
        db_page.meta_title = (update_data["meta_title"] or "").strip() or None

    if "meta_description" in update_data:
        db_page.meta_description = (update_data["meta_description"] or "").strip() or None

    db.commit()
    db.refresh(db_page)
    return db_page


@router.post("/{page_id:int}/publish", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def publish_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    _validate_publishable_page(db_page)

    if db_page.status == models.PageStatus.PUBLISHED:
        return db_page

    now = datetime.now(timezone.utc)
    first_publish = db_page.published_at is None
    db_page.status = models.PageStatus.PUBLISHED
    if first_publish:
        db_page.published_at = now
    db_page.updated_at = now

    db.commit()
    db.refresh(db_page)
    return db_page


@router.post("/{page_id:int}/archive", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def archive_page(
    page_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    if db_page.status != models.PageStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published pages can be archived",
        )

    db_page.status = models.PageStatus.ARCHIVED
    db.commit()
    db.refresh(db_page)
    return db_page


@router.post("/{page_id:int}/draft", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def move_page_to_draft(
    page_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_page = (
        db.query(models.UserPage)
        .filter(models.UserPage.page_id == page_id, models.UserPage.user_id == current_user.user_id)
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    if db_page.status == models.PageStatus.DRAFT:
        return db_page
    db_page.status = models.PageStatus.DRAFT
    db.commit()
    db.refresh(db_page)
    return db_page


@router.patch("/footer", response_model=list[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def update_footer_pages(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    raw_ids = payload.get("ordered_page_ids", [])
    if raw_ids is None:
        raw_ids = []
    if not isinstance(raw_ids, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ordered_page_ids must be a list",
        )

    normalized_ids: list[int] = []
    for raw_id in raw_ids:
        try:
            normalized_ids.append(int(raw_id))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid page id in footer: {raw_id}",
            ) from None

    pages = (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == current_user.user_id)
        .order_by(models.UserPage.created_at.asc())
        .all()
    )
    pages_by_id = {p.page_id: p for p in pages}

    for page in pages:
        page.show_in_footer = False
        page.footer_order = None

    for idx, page_id in enumerate(normalized_ids):
        if page_id not in pages_by_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid page id in footer: {page_id}",
            )
        pages_by_id[page_id].show_in_footer = True
        pages_by_id[page_id].footer_order = idx

    db.commit()
    return (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == current_user.user_id)
        .order_by(models.UserPage.created_at.asc())
        .all()
    )
