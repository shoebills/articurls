from fastapi import Depends, APIRouter, HTTPException, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from ..database import get_db
from .. import models, utils
from ..schemas import blog, user
from ..schemas import page as page_schema


router = APIRouter(
    tags=["Public"],
)


@router.get("/{user_name}/blogs/search", response_model=List[blog.PublicBlogs], status_code=status.HTTP_200_OK)
def search_blogs(
    user_name: str,
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20),
    request: Request = None,
    db: Session = Depends(get_db),
):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    term = f"%{q}%"
    results = (
        db.query(models.Blog)
        .filter(
            models.Blog.user_id == db_user.user_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
            or_(
                models.Blog.title.ilike(term),
                models.Blog.content.ilike(term),
                models.Blog.meta_title.ilike(term),
                models.Blog.meta_description.ilike(term),
            ),
        )
        .order_by(models.Blog.published_at.desc())
        .limit(limit)
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        blogs.append(db_blog)

    return blogs


@router.get("/{user_name}/blogs", response_model=List[blog.PublicBlogs], status_code=status.HTTP_200_OK)
def get_blogs(user_name: str, request: Request, db: Session = Depends(get_db)):

    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found")

    results = (
        db.query(models.Blog)
        .filter(models.Blog.user_id == db_user.user_id, models.Blog.status == models.BlogStatus.PUBLISHED)
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        blogs.append(db_blog)

    return blogs

@router.get("/{user_name}/blog/{slug}", response_model=blog.PublicBlog, status_code=200)
def get_blog(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):

    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.slug == slug, models.Blog.user_id == db_user.user_id)
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")
    if db_blog.status != models.BlogStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")

    db_blog.excerpt = utils.make_excerpt(db_blog.content)
    return db_blog


@router.get("/{user_name}", response_model=user.PublicUser)
def get_user(user_name: str, request: Request, db: Session = Depends(get_db)):

    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return utils.public_user_out(db, db_user)


@router.get("/{user_name}/pages", response_model=List[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def get_pages(user_name: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return (
        db.query(models.UserPage)
        .filter(
            models.UserPage.user_id == db_user.user_id,
            models.UserPage.show_in_footer.is_(True),
            models.UserPage.status == models.PageStatus.PUBLISHED,
        )
        .order_by(models.UserPage.footer_order.asc(), models.UserPage.created_at.asc())
        .all()
    )


@router.get("/{user_name}/page/{slug}", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def get_page(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_page = (
        db.query(models.UserPage)
        .filter(
            models.UserPage.user_id == db_user.user_id,
            models.UserPage.slug == slug,
            models.UserPage.status == models.PageStatus.PUBLISHED,
        )
        .first()
    )
    if not db_page:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    return db_page


@router.get("/{user_name}/categories", status_code=status.HTTP_200_OK)
def get_public_categories(user_name: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    cats = (
        db.query(models.Category)
        .filter(
            models.Category.user_id == db_user.user_id,
            models.Category.show_in_menu.is_(True),
        )
        .order_by(models.Category.menu_order.asc(), models.Category.created_at.asc())
        .all()
    )
    from sqlalchemy import func as sa_func
    result = []
    for c in cats:
        blog_count = (
            db.query(sa_func.count(models.BlogCategory.blog_category_id))
            .filter(models.BlogCategory.category_id == c.category_id)
            .scalar()
        ) or 0
        result.append({
            "category_id": c.category_id,
            "user_id": c.user_id,
            "name": c.name,
            "slug": c.slug,
            "blog_count": blog_count,
            "show_in_menu": c.show_in_menu,
            "menu_order": c.menu_order,
            "created_at": c.created_at,
        })
    return result


@router.get("/{user_name}/category/{slug}", status_code=status.HTTP_200_OK)
def get_public_category_blogs(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_cat = (
        db.query(models.Category)
        .filter(models.Category.user_id == db_user.user_id, models.Category.slug == slug)
        .first()
    )
    if not db_cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    results = (
        db.query(models.Blog)
        .join(models.BlogCategory, models.Blog.blog_id == models.BlogCategory.blog_id)
        .filter(
            models.BlogCategory.category_id == db_cat.category_id,
            models.Blog.user_id == db_user.user_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .all()
    )

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        cat_ids = [
            row[0]
            for row in db.query(models.BlogCategory.category_id)
            .filter(models.BlogCategory.blog_id == db_blog.blog_id)
            .all()
        ]
        db_blog.category_ids = cat_ids
        blogs.append(db_blog)

    return {
        "category": {
            "category_id": db_cat.category_id,
            "name": db_cat.name,
            "slug": db_cat.slug,
        },
        "blogs": blogs,
    }