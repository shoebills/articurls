from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from slugify import slugify
from .. import models, utils
from ..database import get_db
from ..schemas import page as page_schema
from ..security import oauth2
from ..storage.service import save_media

router = APIRouter(
    tags=["Pages"],
    prefix="/pages",
)


@router.post("/media", status_code=status.HTTP_201_CREATED)
async def upload_page_media(
    file: UploadFile = File(...),
    current_user=Depends(oauth2.get_current_user),
):
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file is required")
    stored = await save_media(
        file=file,
        category="pages",
        user_id=current_user.user_id,
    )
    return {"url": stored.url}


def _max_pages_for_user(db: Session, user_id: int) -> int:
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return 10 if utils.is_pro_entitled(db_user, db) else 1


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
    current_count = (
        db.query(models.UserPage).filter(models.UserPage.user_id == current_user.user_id).count()
    )
    max_pages = _max_pages_for_user(db, current_user.user_id)
    if current_count >= max_pages:
        detail = (
            "Free plan supports only one page. Upgrade to Pro for up to 10 pages."
            if max_pages == 1
            else "You can create up to 10 pages on Pro."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title is required")

    new_page = models.UserPage(
        user_id=current_user.user_id,
        title=title,
        content=request.content or "",
        slug=_unique_page_slug(db, current_user.user_id, title),
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
        title = (update_data["title"] or "").strip()
        if not title:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title is required")
        db_page.title = title

    if "content" in update_data:
        db_page.content = update_data["content"] or ""

    if "slug" in update_data:
        new_slug = (update_data["slug"] or "").strip()
        if new_slug and new_slug != db_page.slug:
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


@router.patch("/menu", response_model=list[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def update_menu_pages(
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
                detail=f"Invalid page id in menu: {raw_id}",
            ) from None

    pages = (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == current_user.user_id)
        .order_by(models.UserPage.created_at.asc())
        .all()
    )
    pages_by_id = {p.page_id: p for p in pages}

    for page in pages:
        page.show_in_menu = False
        page.menu_order = None

    for idx, page_id in enumerate(normalized_ids):
        if page_id not in pages_by_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid page id in menu: {page_id}",
            )
        pages_by_id[page_id].show_in_menu = True
        pages_by_id[page_id].menu_order = idx

    db.commit()
    return (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == current_user.user_id)
        .order_by(models.UserPage.created_at.asc())
        .all()
    )


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
