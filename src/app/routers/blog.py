from fastapi import Depends, APIRouter, HTTPException, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from ..database import get_db
from .. import models, utils
from ..utils.html_sanitizer import sanitize_html
from ..schemas import blog
from ..schemas import category as cat_schema
from ..security.oauth2 import get_current_user
from ..security.oauth2 import get_current_site
from ..workers import tasks
from ..storage.service import save_media, delete_media
from ..cache.service import schedule_post_purge
from ..config import settings
from ..utils.rate_limit import check_rate_limit_user
from typing import List
import secrets
from slugify import slugify
from datetime import datetime, timezone
import re

_BLOG_CREATE_LIMIT = 50
_BLOG_UPLOAD_LIMIT = 120
_BLOG_UPDATE_LIMIT = 50
_BLOG_PUBLISH_LIMIT = 30
_BLOG_DELETE_LIMIT = 20
_BLOG_RATE_WINDOW = 60


def _attach_category_ids(db: Session, db_blog):
    """Attach category_ids list to a blog object for serialization."""
    cat_ids = [
        row[0]
        for row in db.query(models.BlogCategory.category_id)
        .filter(models.BlogCategory.blog_id == db_blog.blog_id)
        .all()
    ]
    db_blog.category_ids = cat_ids
    return db_blog

router = APIRouter(
    tags=["Blog"],
    prefix="/blog"
)

@router.post("/", response_model=blog.GetBlog, status_code=status.HTTP_201_CREATED)
def create_blog(request: blog.CreateBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-create", current_user.user_id, _BLOG_CREATE_LIMIT, _BLOG_RATE_WINDOW)

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

    candidate_slug = utils.unique_blog_slug(db, current_site.site_id, base_slug)

    new_blog = models.Blog(
        title=request.title,
        content=sanitize_html(request.content),
        site_id=current_site.site_id,
        author_id=current_site.authors[0].author_id if current_site.authors else None,
        slug=candidate_slug,
        meta_title=candidate_meta_title,
        meta_description=candidate_meta_description,
        notify_subscribers=request.notify_subscribers,
        status=models.BlogStatus.DRAFT,
    )

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    _attach_category_ids(db, new_blog)

    return new_blog

@router.get("/", response_model=List[blog.GetAll], status_code=status.HTTP_200_OK)
def get_blogs(db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    results = db.query(models.Blog).filter(
        models.Blog.site_id == current_site.site_id
    ).all()

    blogs = []
    for db_blog in results:
        db_blog.excerpt = utils.make_excerpt(db_blog.content)
        _attach_category_ids(db, db_blog)
        blogs.append(db_blog)
        
    return blogs

@router.get("/{id}", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def get_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id, models.Blog.site_id == current_site.site_id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    _attach_category_ids(db, db_blog)
    
    return db_blog


@router.post("/{id}/media", response_model=blog.BlogMediaOut, status_code=status.HTTP_201_CREATED)
async def upload_blog_media(id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-upload", current_user.user_id, _BLOG_UPLOAD_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.site_id == current_site.site_id)
        .first()
    )

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    stored = await save_media(
        file=file,
        category="blogs",
        site_id=current_site.site_id,
        author_id=current_site.authors[0].author_id if current_site.authors else None,
        blog_id=db_blog.blog_id,
        db=db,
    )

    max_sort_order = (
        db.query(func.max(models.BlogMedia.sort_order))
        .filter(models.BlogMedia.blog_id == db_blog.blog_id)
        .scalar()
    )
    next_sort_order = (max_sort_order or 0) + 1

    new_media = models.BlogMedia(
        blog_id=db_blog.blog_id,
        site_id=current_site.site_id,
        author_id=current_site.authors[0].author_id if current_site.authors else None,
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
def delete_blog_media(id: int, media_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-upload", current_user.user_id, _BLOG_UPLOAD_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.site_id == current_site.site_id)
        .first()
    )
    
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    db_media = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.media_id == media_id,
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.site_id == current_site.site_id,
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
    url: str = Query(..., description="URL of the media to delete"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user("blog-upload", current_user.user_id, _BLOG_UPLOAD_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = (
        db.query(models.Blog)
        .filter(models.Blog.blog_id == id, models.Blog.site_id == current_site.site_id)
        .first()
    )
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    # Accept either full URL or path-like value by relaxed matching.
    db_media = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.site_id == current_site.site_id,
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
def update_blog(id: int, request: blog.UpdateBlog, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-update", current_user.user_id, _BLOG_UPDATE_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if db_blog.site_id != current_site.site_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    update_data = request.model_dump(exclude_unset=True)

    is_locked = db_blog.status in (models.BlogStatus.PUBLISHED, models.BlogStatus.SCHEDULED, models.BlogStatus.ARCHIVED)
    if is_locked:
        if "title" in update_data and not (update_data["title"] or "").strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Title cannot be empty.",
            )
        if "content" in update_data:
            content_stripped = re.sub(r"<[^>]+>", "", update_data["content"] or "").strip()
            if not content_stripped:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Content cannot be empty.",
                )

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
            # Get a unique slug (may append -1, -2, etc. if needed)
            resolved = utils.unique_blog_slug(
                db, current_site.site_id, new_slug, exclude_blog_id=db_blog.blog_id
            )
            # Use the resolved unique slug
            db_blog.slug = resolved

    # Sanitize content if present in update
    if "content" in update_data:
        update_data["content"] = sanitize_html(update_data["content"])

    if "meta_title" in update_data and update_data["meta_title"] is None:
        title = update_data.get("title", db_blog.title)
        update_data["meta_title"] = (title or "").strip() or None
    elif "meta_title" in update_data:
        update_data["meta_title"] = (update_data["meta_title"] or "").strip() or None

    if "meta_description" in update_data and update_data["meta_description"] is None:
        content = update_data.get("content", db_blog.content)
        update_data["meta_description"] = utils.make_meta_description(content or "") or None
    elif "meta_description" in update_data:
        update_data["meta_description"] = (update_data["meta_description"] or "").strip() or None

    # Separate meaningful content/metadata fields from non-content fields.
    # Only meaningful changes bump updated_at so sitemap lastmod stays accurate.
    MEANINGFUL_FIELDS = {
        "title", "content", "meta_title", "meta_description", "featured_image_url",
    }
    has_meaningful_change = bool(update_data.keys() & MEANINGFUL_FIELDS)

    for key, value in update_data.items():
        setattr(db_blog, key, value)

    if has_meaningful_change:
        db_blog.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(db_blog)
    _attach_category_ids(db, db_blog)

    # Purge cache for this blog post and all listing pages (home + categories)
    # Use FastAPI BackgroundTasks for reliable async execution in sync routes
    schedule_post_purge(background_tasks, current_site, db_blog.slug)

    return db_blog

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_blog(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-delete", current_user.user_id, _BLOG_DELETE_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")
    
    if db_blog.site_id != current_site.site_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    schedule_post_purge(background_tasks, current_site, db_blog.slug)
    
    # Delete media objects from storage (R2/local) before DB rows are removed.
    media_rows = (
        db.query(models.BlogMedia)
        .filter(
            models.BlogMedia.blog_id == db_blog.blog_id,
            models.BlogMedia.site_id == current_site.site_id,
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
    db.query(models.BlogCategory).filter(models.BlogCategory.blog_id == db_blog.blog_id).delete(synchronize_session=False)
    db.delete(db_blog)
    db.commit()

    return {"message": "Blog deleted"}

@router.post("/{id}/publish", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def publish_blog(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-publish", current_user.user_id, _BLOG_PUBLISH_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if db_blog.site_id != current_site.site_id:
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to perform this action"
    )

    # Validate title and content before publishing
    if not db_blog.title or not db_blog.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title is required to publish"
        )
    
    # Check if content is empty (strip HTML tags and whitespace)
    content_text = re.sub(r'<[^>]+>', '', db_blog.content or '').strip()
    if not content_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content is required to publish"
        )

    if db_blog.status == models.BlogStatus.PUBLISHED:
        return db_blog
    
    first_publish = db_blog.published_at is None
    now = datetime.now(timezone.utc)

    db_blog.status = models.BlogStatus.PUBLISHED

    if first_publish:
        utils.maybe_replace_placeholder_slug_on_publish(db, db_blog)
        db_blog.published_at = now

    db_blog.meta_title, db_blog.meta_description = utils.materialize_content_meta_defaults(
        title=db_blog.title,
        content=db_blog.content,
        meta_title=db_blog.meta_title,
        meta_description=db_blog.meta_description,
    )

    # Publishing is a meaningful lifecycle event — bump updated_at so
    # sitemap lastmod reflects when the post became publicly visible.
    db_blog.updated_at = now

    db.commit()
    db.refresh(db_blog)
    _attach_category_ids(db, db_blog)

    schedule_post_purge(background_tasks, current_site, db_blog.slug)

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()

    if not db_user:
        return db_blog

    if first_publish and db_blog.notify_subscribers:
        tasks.send_post_emails.delay(db_blog.blog_id)

    return db_blog

@router.post("/{id}/archive", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def archive_blog(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-publish", current_user.user_id, _BLOG_PUBLISH_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    if db_blog.site_id != current_site.site_id:
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
    
    old_updated = db_blog.updated_at
    db_blog.status = models.BlogStatus.ARCHIVED
    # Archiving is a lifecycle change, not a content change — preserve updated_at
    db_blog.updated_at = old_updated

    db.commit()
    db.refresh(db_blog)
    _attach_category_ids(db, db_blog)

    schedule_post_purge(background_tasks, current_site, db_blog.slug)

    return db_blog


@router.post("/{id}/schedule", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def schedule_blog(id: int, request: blog.ScheduleBlog, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    check_rate_limit_user("blog-publish", current_user.user_id, _BLOG_PUBLISH_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if db_blog.site_id != current_site.site_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    # Validate title and content before scheduling
    if not db_blog.title or not db_blog.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title is required to schedule"
        )
    
    # Check if content is empty (strip HTML tags and whitespace)
    content_text = re.sub(r'<[^>]+>', '', db_blog.content or '').strip()
    if not content_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Content is required to schedule"
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
    
    now = datetime.now(timezone.utc)

    if request.scheduled_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scheduled time must be in the future"
    )

    old_updated = db_blog.updated_at
    db_blog.status = models.BlogStatus.SCHEDULED
    db_blog.scheduled_at = request.scheduled_at.astimezone(timezone.utc)
    db_blog.meta_title, db_blog.meta_description = utils.materialize_content_meta_defaults(
        title=db_blog.title,
        content=db_blog.content,
        meta_title=db_blog.meta_title,
        meta_description=db_blog.meta_description,
    )
    # Scheduling is not a meaningful content change — preserve updated_at
    db_blog.updated_at = old_updated

    db.commit()
    db.refresh(db_blog)

    return db_blog

@router.post("/{id}/unschedule", status_code=status.HTTP_200_OK)
def unschedule_blog(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):
    
    db_blog = db.query(models.Blog).filter(models.Blog.blog_id == id).first()

    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Blog with id: {id} not found"
    )
    
    if db_blog.site_id != current_site.site_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to perform this action"
    )

    if db_blog.status != models.BlogStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blog is not scheduled"
    )

    old_updated = db_blog.updated_at
    db_blog.status = models.BlogStatus.DRAFT
    db_blog.scheduled_at = None
    # Unscheduling is not a meaningful content change — preserve updated_at
    db_blog.updated_at = old_updated

    db.commit()
    db.refresh(db_blog)
    _attach_category_ids(db, db_blog)

    return db_blog


@router.patch("/{id}/categories", response_model=blog.GetBlog, status_code=status.HTTP_200_OK)
def assign_blog_categories(
    id: int,
    request: cat_schema.BlogCategoryAssign,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user("blog-publish", current_user.user_id, _BLOG_PUBLISH_LIMIT, _BLOG_RATE_WINDOW)

    db_blog = db.query(models.Blog).filter(
        models.Blog.blog_id == id, models.Blog.site_id == current_site.site_id
    ).first()
    if not db_blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Blog with id: {id} not found")

    # Validate all category_ids belong to the current user
    if request.category_ids:
        valid_cats = (
            db.query(models.Category.category_id)
            .filter(
                models.Category.site_id == current_site.site_id,
                models.Category.category_id.in_(request.category_ids),
            )
            .all()
        )
        valid_ids = {row[0] for row in valid_cats}
        invalid = set(request.category_ids) - valid_ids
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category ids: {list(invalid)}",
            )

    # Compute diff to avoid mass-delete races that cause unique-constraint violations
    existing_rows = (
        db.query(models.BlogCategory)
        .filter(models.BlogCategory.blog_id == db_blog.blog_id)
        .all()
    )
    existing_ids = {row.category_id for row in existing_rows}
    desired_ids = set(request.category_ids)

    to_remove = existing_ids - desired_ids
    to_add = desired_ids - existing_ids

    if to_remove:
        db.query(models.BlogCategory).filter(
            models.BlogCategory.blog_id == db_blog.blog_id,
            models.BlogCategory.category_id.in_(to_remove),
        ).delete(synchronize_session=False)

    if to_add:
        stmt = (
            insert(models.BlogCategory)
            .values([
                {"blog_id": db_blog.blog_id, "category_id": cat_id}
                for cat_id in to_add
            ])
            .on_conflict_do_nothing(
                index_elements=["blog_id", "category_id"]
            )
        )
        db.execute(stmt)

    db.commit()
    db.refresh(db_blog)
    _attach_category_ids(db, db_blog)

    schedule_post_purge(background_tasks, current_site, db_blog.slug)

    return db_blog