from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import blog
from ..security.oauth2 import get_current_user
from typing import List
from slugify import slugify
from datetime import datetime, timezone

router = APIRouter(
    tags=["Blog"],
    prefix="/blog"
)

@router.post("/", response_model=blog.GetBlog, status_code=status.HTTP_201_CREATED)
def create_blog(request: blog.CreateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    if request.slug:
        base_slug = slugify(request.slug)
    else:
        base_slug = slugify(request.title)

    slug_obj = base_slug
    counter = 1

    while db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id, models.Blog.slug == slug_obj).first():
        slug_obj = f"{base_slug}-{counter}"
        counter += 1

    new_blog = models.Blog(title=request.title, 
                           content=request.content, 
                           user_id=current_user.user_id,
                           slug=slug_obj,
                           seo_title=request.seo_title,
                           seo_description=request.seo_description,
                           status=models.BlogStatus.DRAFT)

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return new_blog

@router.get("/", response_model=List[blog.GetBlog], status_code=200)
def get_blogs(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blogs = db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id).all()

    return blogs

@router.get("/{id}", response_model=blog.GetBlog, status_code=200)
def get_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    return blog

@router.patch("/{id}", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def update_blog(id: int, request: blog.UpdateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(blog, key, value)

    db.commit()
    db.refresh(blog)

    return blog

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    db.delete(blog)
    db.commit()

    return {"message": "Blog deleted"}

@router.post("/{id}/publish", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def publish_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    if blog.status == models.BlogStatus.PUBLISHED:
        return blog
    
    blog.status = models.BlogStatus.PUBLISHED
    
    # Only set publish date if first time
    if blog.published_at is None:
        blog.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(blog)

    return blog

@router.post("/{id}/archive", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def archive_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    if blog.status != models.BlogStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published blogs can be archived"
    )

    if blog.status == models.BlogStatus.ARCHIVED:
        return blog
    
    blog.status = models.BlogStatus.ARCHIVED

    db.commit()
    db.refresh(blog)

    return blog

@router.post("/{id}/schedule", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def schedule_blog(id: int, request: blog.ScheduleBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if blog.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    if blog.status == models.BlogStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published blogs cannot be scheduled"
    )
    
    if blog.status == models.BlogStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived blogs cannot be scheduled"
    )

    if blog.status == models.BlogStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reschedule a scheduled blog"
    )
    
    now = datetime.now(timezone.utc)

    if request.scheduled_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be in the future"
    )

    blog.status = models.BlogStatus.SCHEDULED
    blog.scheduled_at = request.scheduled_at.astimezone(timezone.utc)

    db.commit()
    db.refresh(blog)

    return blog

@router.post("/{id}/unschedule", status_code=status.HTTP_200_OK)
def unschedule_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    
    blog_obj = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not blog_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if blog_obj.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    if blog_obj.status != models.BlogStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blog is not scheduled"
    )

    blog_obj.status = models.BlogStatus.DRAFT
    blog_obj.scheduled_at = None

    db.commit()
    db.refresh(blog_obj)

    return blog_obj