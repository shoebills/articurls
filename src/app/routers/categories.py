from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify
from .. import models
from ..database import get_db
from ..schemas import category as cat_schema
from ..schemas import blog as blog_schema
from ..security import oauth2
from ..utils import is_pro_entitled, make_excerpt

router = APIRouter(
    tags=["Categories"],
    prefix="/categories",
)

MAX_CATEGORIES_FREE = 3


def _unique_category_slug(db: Session, user_id: int, name: str) -> str:
    base = slugify(name) or "category"
    candidate = base
    idx = 2
    while (
        db.query(models.Category)
        .filter(models.Category.user_id == user_id, models.Category.slug == candidate)
        .first()
        is not None
    ):
        candidate = f"{base}-{idx}"
        idx += 1
    return candidate


def _category_out(db: Session, cat: models.Category) -> dict:
    blog_count = (
        db.query(func.count(models.BlogCategory.blog_category_id))
        .filter(models.BlogCategory.category_id == cat.category_id)
        .scalar()
    ) or 0
    return {
        "category_id": cat.category_id,
        "user_id": cat.user_id,
        "name": cat.name,
        "slug": cat.slug,
        "blog_count": blog_count,
        "show_in_menu": cat.show_in_menu,
        "menu_order": cat.menu_order,
        "created_at": cat.created_at,
    }


@router.get("/", response_model=list[cat_schema.CategoryOut], status_code=status.HTTP_200_OK)
def list_categories(
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    cats = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.user_id)
        .order_by(models.Category.created_at.asc())
        .all()
    )
    return [_category_out(db, c) for c in cats]


@router.post("/", response_model=cat_schema.CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    request: cat_schema.CategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    current_count = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.user_id)
        .count()
    )
    is_pro = is_pro_entitled(current_user, db)
    if not is_pro and current_count >= MAX_CATEGORIES_FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Free plan supports up to {MAX_CATEGORIES_FREE} categories. Upgrade to Pro for unlimited.",
        )

    name = request.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Category name is required",
        )

    new_cat = models.Category(
        user_id=current_user.user_id,
        name=name,
        slug=_unique_category_slug(db, current_user.user_id, name),
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return _category_out(db, new_cat)


@router.patch("/menu", response_model=list[cat_schema.CategoryOut], status_code=status.HTTP_200_OK)
def update_menu_categories(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    raw_ids = payload.get("ordered_category_ids", [])
    if raw_ids is None:
        raw_ids = []
    if not isinstance(raw_ids, list):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ordered_category_ids must be a list",
        )

    normalized_ids: list[int] = []
    for raw_id in raw_ids:
        try:
            normalized_ids.append(int(raw_id))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid category id in menu: {raw_id}",
            ) from None

    cats = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.user_id)
        .order_by(models.Category.created_at.asc())
        .all()
    )
    cats_by_id = {c.category_id: c for c in cats}

    for cat in cats:
        cat.show_in_menu = False
        cat.menu_order = None

    for idx, cat_id in enumerate(normalized_ids):
        if cat_id not in cats_by_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid category id in menu: {cat_id}",
            )
        cats_by_id[cat_id].show_in_menu = True
        cats_by_id[cat_id].menu_order = idx

    db.commit()
    cats = (
        db.query(models.Category)
        .filter(models.Category.user_id == current_user.user_id)
        .order_by(models.Category.created_at.asc())
        .all()
    )
    return [_category_out(db, c) for c in cats]


@router.patch("/{category_id}", response_model=cat_schema.CategoryOut, status_code=status.HTTP_200_OK)
def update_category(
    category_id: int,
    request: cat_schema.CategoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_cat = (
        db.query(models.Category)
        .filter(
            models.Category.category_id == category_id,
            models.Category.user_id == current_user.user_id,
        )
        .first()
    )
    if not db_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if request.name is not None:
        name = request.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Category name is required",
            )
        if name != db_cat.name:
            db_cat.name = name
            db_cat.slug = _unique_category_slug(db, current_user.user_id, name)

    db.commit()
    db.refresh(db_cat)
    return _category_out(db, db_cat)


@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_cat = (
        db.query(models.Category)
        .filter(
            models.Category.category_id == category_id,
            models.Category.user_id == current_user.user_id,
        )
        .first()
    )
    if not db_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(db_cat)
    db.commit()
    return {"message": "Category deleted"}


@router.get("/{category_id}/blogs", response_model=list[blog_schema.GetAll], status_code=status.HTTP_200_OK)
def get_category_blogs(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(oauth2.get_current_user),
):
    db_cat = (
        db.query(models.Category)
        .filter(
            models.Category.category_id == category_id,
            models.Category.user_id == current_user.user_id,
        )
        .first()
    )
    if not db_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    results = (
        db.query(models.Blog, func.count(models.Views.view_id).label("view_count"))
        .join(models.BlogCategory, models.Blog.blog_id == models.BlogCategory.blog_id)
        .outerjoin(models.Views, models.Blog.blog_id == models.Views.blog_id)
        .filter(
            models.BlogCategory.category_id == category_id,
            models.Blog.user_id == current_user.user_id,
        )
        .group_by(models.Blog.blog_id)
        .all()
    )
    blogs = []
    for db_blog, view_count in results:
        db_blog.view_count = view_count
        db_blog.excerpt = make_excerpt(db_blog.content)
        # Attach category_ids
        cat_ids = [
            row[0]
            for row in db.query(models.BlogCategory.category_id)
            .filter(models.BlogCategory.blog_id == db_blog.blog_id)
            .all()
        ]
        db_blog.category_ids = cat_ids
        blogs.append(db_blog)
    return blogs

