import hashlib
from fastapi import Depends, APIRouter, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, utils
from ..schemas import blog, user
from ..schemas import page as page_schema


router = APIRouter(
    tags=["Public"],
)


@router.get("/{user_name}/blogs", response_model=List[blog.PublicBlogs], status_code=status.HTTP_200_OK)
def get_blogs(user_name: str, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found")

    db_blogs = db.query(models.Blog).filter(models.Blog.user_id == db_user.user_id, models.Blog.status == models.BlogStatus.PUBLISHED).all()

    for blog in db_blogs:
        blog.excerpt = utils.make_excerpt(blog.content)

    return db_blogs

@router.get("/{user_name}/blog/{slug}", response_model=blog.PublicBlog, status_code=200)
def get_blog(user_name: str, slug: str, request: Request, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

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

    ip = (request.client.host if request.client else None) or ""
    user_agent = request.headers.get("user-agent", "")
    visitor_hash = hashlib.sha256(f"{ip}{user_agent}".encode()).hexdigest()
    db.add(models.Views(
            user_id=db_user.user_id,
            blog_id=db_blog.blog_id,
            visitor_hash=visitor_hash,
        ))
    db.commit()

    return db_blog

@router.get("/{user_name}", response_model=user.PublicUser)
def get_user(user_name: str, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return db_user


@router.get("/{user_name}/pages", response_model=List[page_schema.UserPageOut], status_code=status.HTTP_200_OK)
def get_pages(user_name: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return (
        db.query(models.UserPage)
        .filter(models.UserPage.user_id == db_user.user_id, models.UserPage.show_in_menu.is_(True))
        .order_by(models.UserPage.menu_order.asc(), models.UserPage.created_at.asc())
        .all()
    )


@router.get("/{user_name}/page/{slug}", response_model=page_schema.UserPageOut, status_code=status.HTTP_200_OK)
def get_page(user_name: str, slug: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()
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