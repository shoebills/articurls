import hashlib
import jwt
from fastapi import Depends, APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, utils
from ..schemas import blog, user
from ..schemas import page as page_schema
from ..config import settings


router = APIRouter(
    tags=["Public"],
)


@router.get("/{user_name}/blogs", response_model=List[blog.PublicBlogs], status_code=status.HTTP_200_OK)
def get_blogs(user_name: str, request: Request, db: Session = Depends(get_db)):

    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found")

    db_blogs = db.query(models.Blog).filter(models.Blog.user_id == db_user.user_id, models.Blog.status == models.BlogStatus.PUBLISHED).all()

    for blog in db_blogs:
        blog.excerpt = utils.make_excerpt(blog.content)

    return db_blogs

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


@router.post("/{user_name}/blog/{slug}/view", status_code=status.HTTP_204_NO_CONTENT)
def track_blog_view(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_blog = (
        db.query(models.Blog)
        .filter(
            models.Blog.slug == slug,
            models.Blog.user_id == db_user.user_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")

    is_owner_view = False
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            try:
                payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
                email = payload.get("sub")
                if email:
                    viewer = utils.user_by_email(db, email)
                    is_owner_view = bool(viewer and viewer.user_id == db_user.user_id)
            except jwt.PyJWTError:
                pass

    if is_owner_view:
        return

    ip = (request.client.host if request.client else None) or ""
    user_agent = request.headers.get("user-agent", "")
    visitor_hash = hashlib.sha256(f"{ip}{user_agent}".encode()).hexdigest()
    db.add(models.Views(
            user_id=db_user.user_id,
            blog_id=db_blog.blog_id,
            visitor_hash=visitor_hash,
        ))
    db.commit()


@router.get("/{user_name}/blog/{slug}/ads", response_model=blog.PublicBlogAds, status_code=status.HTTP_200_OK)
def get_blog_ads(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):
    db_user, canonical_username = utils.resolve_username_to_current(db, user_name)
    if db_user and canonical_username != utils.normalize_username(user_name):
        return utils.permanent_username_redirect(str(request.url.path), canonical_username, request.url.query)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_blog = (
        db.query(models.Blog)
        .filter(
            models.Blog.slug == slug,
            models.Blog.user_id == db_user.user_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog not found")

    enabled = bool(
        utils.is_pro_entitled(db_user, db)
        and db_user.ads_enabled
        and db_blog.ads_enabled
        and db_user.ad_code
    )
    return {
        "enabled": enabled,
        "ad_code": db_user.ad_code if enabled else None,
        "ad_frequency": db_user.ad_frequency or 3,
    }

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
        .filter(models.UserPage.user_id == db_user.user_id, models.UserPage.slug == slug)
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

    db_blogs = (
        db.query(models.Blog)
        .join(models.BlogCategory, models.Blog.blog_id == models.BlogCategory.blog_id)
        .filter(
            models.BlogCategory.category_id == db_cat.category_id,
            models.Blog.user_id == db_user.user_id,
            models.Blog.status == models.BlogStatus.PUBLISHED,
        )
        .all()
    )

    for b in db_blogs:
        b.excerpt = utils.make_excerpt(b.content)
        cat_ids = [
            row[0]
            for row in db.query(models.BlogCategory.category_id)
            .filter(models.BlogCategory.blog_id == b.blog_id)
            .all()
        ]
        b.category_ids = cat_ids

    return {
        "category": {
            "category_id": db_cat.category_id,
            "name": db_cat.name,
            "slug": db_cat.slug,
        },
        "blogs": db_blogs,
    }