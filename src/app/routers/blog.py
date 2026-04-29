from fastapi import Depends, APIRouter, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from .. import models, utils
from ..schemas import blog
from ..security.oauth2 import get_current_user
from ..workers import tasks
from ..storage.service import save_media, delete_media
from typing import List
import secrets
from slugify import slugify
from datetime import datetime, timezone

router = APIRouter(
    tags=["Blog"],
    prefix="/blog"
)

@router.post("/", response_model=blog.GetBlog, status_code=status.HTTP_201_CREATED)
def create_blog(request: blog.CreateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    # Meta
    if request.meta_title is not None:
        candidate_meta_title = request.meta_title
    else:
        candidate_meta_title = None

    if request.meta_description is not None:
        candidate_meta_description = request.meta_description
    else:
        candidate_meta_description = None

    # Slug
    if request.slug:
        base_slug = slugify(request.slug) or None
    else:
        base_slug = slugify(request.title) if request.title and request.title.strip() else None

    if not base_slug:
        base_slug = f"draft-{secrets.token_hex(6)}"

    candidate_slug = utils.unique_blog_slug(db, current_user.user_id, base_slug)

    if request.notify_subscribers:
        utils.assert_pro(db, current_user.user_id)

    new_blog = models.Blog(
        title=request.title,
        content=request.content,
        user_id=current_user.user_id,
        slug=candidate_slug,
        meta_title=candidate_meta_title,
        meta_description=candidate_meta_description,
        notify_subscribers=request.notify_subscribers,
        status=models.BlogStatus.DRAFT,
    )

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


@router.patch("/ads/selection", response_model=List[blog.GetAll], status_code=status.HTTP_200_OK)
def update_ads_selection(request: blog.AdsSelectionUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):

    utils.assert_pro(db, current_user.user_id)

    selected_ids = set(request.blog_ids or [])
    all_blogs = db.query(models.Blog).filter(models.Blog.user_id == current_user.user_id).all()

    user_blog_ids = set()
    for b in all_blogs:
        user_blog_ids.add(b.blog_id)
    
    published_blog_ids = set()
    for b in all_blogs:
        if b.status == models.BlogStatus.PUBLISHED:
            published_blog_ids.add(b.blog_id)

    if not selected_ids.issubset(user_blog_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid blog selection.")
    if not selected_ids.issubset(published_blog_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ads can only be enabled on published blogs.")

    for db_blog in all_blogs:
        if db_blog.blog_id in selected_ids:
            db_blog.ads_enabled = True
        else:
            db_blog.ads_enabled = False

    db.commit()

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


@router.post("/{id}/media", response_model=blog.BlogMediaOut, status_code=status.HTTP_201_CREATED)
async def upload_blog_media(id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id)
        .first()
    )

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    stored = await save_media(
        file=file,
        category="blogs",
        user_id=current_user.user_id,
        blog_id=db_blog.blog_id,
    )

    max_sort_order = (
        db.query(func.max(models.BlogMedia.sort_order))
        .filter(models.BlogMedia.blog_id == db_blog.blog_id)
        .scalar()
    )
    next_sort_order = (max_sort_order or 0) + 1

    new_media = models.BlogMedia(
        blog_id=db_blog.blog_id,
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


@router.delete("/{id}/media/{media_id}", status_code=status.HTTP_200_OK)
def delete_blog_media(id: int, media_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id)
        .first()
    )
    
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    db_media = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.media_id == media_id,
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.user_id == current_user.user_id,
        )
        .first()
    )
    if not db_media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Media with id: {media_id} not found")

    delete_media(db_media.storage_key)
    db.delete(db_media)
    db.commit()

    return {"message": "Media deleted"}


@router.delete("/{id}/media", status_code=status.HTTP_200_OK)
def delete_blog_media_by_url(
    id: int,
    url: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.user_id == current_user.user_id)
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    # Accept either full URL or path-like value by relaxed matching.
    db_media = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.user_id == current_user.user_id,
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
    title_or_content_changed = False

    if update_data.get("notify_subscribers") is True:
        utils.assert_pro(db, current_user.user_id)

    slug_in = update_data.pop("slug", None)
    if slug_in is not None:
        new_slug = slugify(slug_in.strip()) if slug_in.strip() else None
        slug_locked = db_blog.status in (models.BlogStatus.PUBLISHED, models.BlogStatus.ARCHIVED)
        wants_different_slug = new_slug is not None and new_slug != db_blog.slug

        if slug_locked and wants_different_slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change the URL slug after the post is published.",
            )

        if not slug_locked and wants_different_slug:
            resolved = utils.unique_blog_slug(
                db, current_user.user_id, new_slug, exclude_blog_id=db_blog.blog_id
            )
            if resolved != new_slug:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="That URL slug is already used by another post.",
                )
            db_blog.slug = new_slug

    if "title" in update_data and update_data.get("title") != db_blog.title:
        title_or_content_changed = True
    if "content" in update_data and update_data.get("content") != db_blog.content:
        title_or_content_changed = True

    for key, value in update_data.items():
        setattr(db_blog, key, value)

    if title_or_content_changed:
        db_blog.updated_at = datetime.now(timezone.utc)

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
    
    # Delete media objects from storage (R2/local) before DB rows are removed.
    media_rows = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.user_id == current_user.user_id,
        )
        .all()
    )
    for media in media_rows:
        try:
            delete_media(media.storage_key)
        except Exception:
            # Keep delete resilient even if object was already removed externally.
            pass

    db.query(models.EmailLogs).filter(models.EmailLogs.blog_id == db_blog.blog_id).delete(synchronize_session=False)
    db.query(models.Views).filter(models.Views.blog_id == db_blog.blog_id).delete(synchronize_session=False)
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

    if first_publish:
        utils.maybe_replace_placeholder_slug_on_publish(db, db_blog)

    # Only set publish date if first time
    if first_publish:
        db_blog.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_blog)

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        return db_blog

    if first_publish and db_blog.notify_subscribers:
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