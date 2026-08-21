from typing import List, Optional, Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify

from .. import models
from ..database import get_db
from ..schemas import author as author_schema
from ..security import oauth2
from ..security.oauth2 import get_current_user, get_current_site
from ..cache.service import schedule_tenant_purge
from ..storage.service import save_image_local

router = APIRouter(
    tags=["Authors"],
    prefix="/authors",
)


def _unique_author_slug(db: Session, site_id: Any, name_or_slug: str, current_author_id: Any | None = None) -> str:
    base = slugify(name_or_slug) or "author"
    candidate = base
    idx = 2
    while True:
        query = db.query(models.Author).filter(
            models.Author.site_id == site_id,
            models.Author.slug == candidate,
        )
        if current_author_id is not None:
            query = query.filter(models.Author.author_id != current_author_id)
        if query.first() is None:
            break
        candidate = f"{base}-{idx}"
        idx += 1
    return candidate


def _author_out(db: Session, author: models.Author) -> dict:
    blog_count = (
        db.query(func.count(models.Blog.blog_id))
        .filter(models.Blog.author_id == author.author_id)
        .scalar()
    ) or 0
    return {
        "author_id": author.author_id,
        "site_id": author.site_id,
        "name": author.name,
        "slug": author.slug,
        "bio": author.bio,
        "occupation": author.occupation,
        "instagram_link": author.instagram_link,
        "x_link": author.x_link,
        "pinterest_link": author.pinterest_link,
        "facebook_link": author.facebook_link,
        "linkedin_link": author.linkedin_link,
        "github_link": author.github_link,
        "youtube_link": author.youtube_link,
        "website_link": author.website_link,
        "profile_image_url": author.profile_image_url,
        "blog_count": blog_count,
        "created_at": author.created_at,
        "updated_at": author.updated_at,
    }


@router.get("/", response_model=List[author_schema.AuthorOut], status_code=status.HTTP_200_OK)
def list_authors(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    authors = (
        db.query(models.Author)
        .filter(models.Author.site_id == current_site.site_id)
        .order_by(models.Author.created_at.asc())
        .all()
    )
    return [_author_out(db, a) for a in authors]


@router.post("/", response_model=author_schema.AuthorOut, status_code=status.HTTP_201_CREATED)
def create_author(
    request: author_schema.AuthorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    name = request.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Author name is required",
        )

    slug_source = request.slug.strip() if request.slug else name
    unique_slug = _unique_author_slug(db, current_site.site_id, slug_source)

    new_author = models.Author(
        site_id=current_site.site_id,
        name=name,
        slug=unique_slug,
        bio=request.bio,
        occupation=request.occupation,
        instagram_link=request.instagram_link,
        x_link=request.x_link,
        pinterest_link=request.pinterest_link,
        facebook_link=request.facebook_link,
        linkedin_link=request.linkedin_link,
        github_link=request.github_link,
        youtube_link=request.youtube_link,
        website_link=request.website_link,
        profile_image_url=request.profile_image_url,
    )
    db.add(new_author)
    db.commit()
    db.refresh(new_author)

    schedule_tenant_purge(background_tasks, current_site)
    return _author_out(db, new_author)


@router.get("/{author_id}", response_model=author_schema.AuthorOut, status_code=status.HTTP_200_OK)
def get_author(
    author_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    author = (
        db.query(models.Author)
        .filter(
            models.Author.author_id == author_id,
            models.Author.site_id == current_site.site_id,
        )
        .first()
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return _author_out(db, author)


@router.patch("/{author_id}", response_model=author_schema.AuthorOut, status_code=status.HTTP_200_OK)
def update_author(
    author_id: uuid.UUID,
    request: author_schema.AuthorUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    author = (
        db.query(models.Author)
        .filter(
            models.Author.author_id == author_id,
            models.Author.site_id == current_site.site_id,
        )
        .first()
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    update_data = request.model_dump(exclude_unset=True)
    if "name" in update_data:
        name = (update_data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Author name cannot be empty")
        author.name = name

    if "slug" in update_data and update_data["slug"]:
        new_slug = _unique_author_slug(db, current_site.site_id, update_data["slug"], current_author_id=author_id)
        author.slug = new_slug

    for field in [
        "bio",
        "occupation",
        "instagram_link",
        "x_link",
        "pinterest_link",
        "facebook_link",
        "linkedin_link",
        "github_link",
        "youtube_link",
        "website_link",
        "profile_image_url",
    ]:
        if field in update_data:
            setattr(author, field, update_data[field])

    db.commit()
    db.refresh(author)

    schedule_tenant_purge(background_tasks, current_site)
    return _author_out(db, author)


@router.delete("/{author_id}", status_code=status.HTTP_200_OK)
def delete_author(
    author_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    total_authors = (
        db.query(func.count(models.Author.author_id))
        .filter(models.Author.site_id == current_site.site_id)
        .scalar()
    ) or 0
    if total_authors <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the only author on your site.",
        )

    author = (
        db.query(models.Author)
        .filter(
            models.Author.author_id == author_id,
            models.Author.site_id == current_site.site_id,
        )
        .first()
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    # Reassign blogs to another author on the site
    fallback_author = (
        db.query(models.Author)
        .filter(
            models.Author.site_id == current_site.site_id,
            models.Author.author_id != author_id,
        )
        .first()
    )
    if fallback_author:
        db.query(models.Blog).filter(models.Blog.author_id == author_id).update(
            {models.Blog.author_id: fallback_author.author_id},
            synchronize_session=False,
        )

    db.delete(author)
    db.commit()

    schedule_tenant_purge(background_tasks, current_site)
    return {"message": "Author deleted"}


@router.post("/{author_id}/avatar", status_code=status.HTTP_200_OK)
async def upload_author_avatar(
    author_id: uuid.UUID,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    author = (
        db.query(models.Author)
        .filter(
            models.Author.author_id == author_id,
            models.Author.site_id == current_site.site_id,
        )
        .first()
    )
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")

    image_url = await save_image_local(file=file, category="authors", user_id=current_user.user_id, db=db)
    author.profile_image_url = image_url
    db.commit()
    db.refresh(author)

    schedule_tenant_purge(background_tasks, current_site)
    return {"profile_image_url": author.profile_image_url}
