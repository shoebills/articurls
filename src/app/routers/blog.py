from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models, utils
from ..schemas import blog
from ..security.oauth2 import get_current_user
from ..workers import tasks
from typing import List
from slugify import slugify
from datetime import datetime, timezone

router = APIRouter(
    tags=["Blog"],
    prefix="/blog"
)

@router.post("/", response_model=blog.GetBlog, status_code=status.HTTP_201_CREATED)
def create_blog(request: blog.CreateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    if request.seo_title:
        candidate_seo_title = request.seo_title
    else:
        candidate_seo_title = request.title

    if request.seo_description:
        candidate_seo_description = request.seo_description
    else:
        candidate_seo_description = utils.make_seo_description(request.content)

    if request.slug:
        base_slug = slugify(request.slug)
    else:
        base_slug = slugify(request.title)

    candidate_slug = base_slug
    counter = 1

    while db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id, models.Blog.slug == candidate_slug).first():
        candidate_slug = f"{base_slug}-{counter}"
        counter += 1

    new_blog = models.Blog(title=request.title, 
                           content=request.content, 
                           user_id=current_user.user_id,
                           slug=candidate_slug,
                           seo_title=candidate_seo_title,
                           seo_description=candidate_seo_description,
                           status=models.BlogStatus.DRAFT)

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)

    return new_blog

@router.get("/", response_model=List[blog.GetAll], status_code=status.HTTP_200_OK)
def get_blogs(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    # returns (blog, views)
    results = db.query(
        models.Blog,
        func.count(models.Views.view_id).label("view_count")
    ).outerjoin(
        models.Views, models.Blog.blog_id == models.Views.blog_id
    ).filter(
        models.Blog.user_id == current_user.user_id
    ).group_by(
        models.Blog.blog_id
    ).all()
    
    blogs = []
    for db_blog, view_count in results:
        db_blog.view_count = view_count
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        blogs.append(db_blog)
        
    return blogs

@router.get("/{id}", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def get_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    return db_blog

@router.patch("/{id}", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def update_blog(id: int, request: blog.UpdateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_blog, key, value)

    db.commit()
    db.refresh(db_blog)

    return db_blog

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )
    
    db.delete(db_blog)
    db.commit()

    return {"message": "Blog deleted"}

@router.post("/{id}/publish", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def publish_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    if db_blog.status == models.BlogStatus.PUBLISHED:
        return db_blog
    
    first_publish = db_blog.published_at is None

    db_blog.status = models.BlogStatus.PUBLISHED
    
    # Only set publish date if first time
    if first_publish:
        db_blog.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_blog)

    if first_publish:
        tasks.send_post_emails.delay(db_blog.blog_id)
    
    return db_blog

@router.post("/{id}/archive", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def archive_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    if db_blog.status != models.BlogStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published blogs can be archived"
    )

    if db_blog.status == models.BlogStatus.ARCHIVED:
        return db_blog
    
    db_blog.status = models.BlogStatus.ARCHIVED

    db.commit()
    db.refresh(db_blog)

    return db_blog

@router.post("/{id}/schedule", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def schedule_blog(id: int, request: blog.ScheduleBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    if db_blog.status == models.BlogStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published blogs cannot be scheduled"
    )
    
    if db_blog.status == models.BlogStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived blogs cannot be scheduled"
    )

    if db_blog.status == models.BlogStatus.SCHEDULED:
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

    db_blog.status = models.BlogStatus.SCHEDULED
    db_blog.scheduled_at = request.scheduled_at.astimezone(timezone.utc)

    db.commit()
    db.refresh(db_blog)

    return db_blog

@router.post("/{id}/unschedule", status_code=status.HTTP_200_OK)
def unschedule_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    
    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if db_blog.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    if db_blog.status != models.BlogStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blog is not scheduled"
    )

    db_blog.status = models.BlogStatus.DRAFT
    db_blog.scheduled_at = None

    db.commit()
    db.refresh(db_blog)

    return db_blog