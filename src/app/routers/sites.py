from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify
from typing import List
import re
import uuid

from .. import models, utils
from ..database import get_db
from ..schemas import site as site_schema
from ..security.oauth2 import get_current_user, get_current_site
from ..cache.service import schedule_tenant_purge
from ..storage.service import delete_media
from ..config import settings
from ..umami.client import UmamiClient, UmamiError

router = APIRouter(
    tags=["Sites"],
    prefix="/sites",
)

RESERVED_SUBDOMAINS = {
    "www", "app", "api", "admin", "mail", "support", "auth", "billing",
    "analytics", "dashboard", "help", "static", "media", "assets", "blog",
    "site", "sites", "root", "dev", "staging", "test", "demo", "docs",
}


def _site_summary_out(db: Session, site: models.Site) -> dict:
    post_count = (
        db.query(func.count(models.Blog.blog_id))
        .filter(models.Blog.site_id == site.site_id)
        .scalar()
    ) or 0
    subscriber_count = (
        db.query(func.count(models.Subscriber.subscriber_id))
        .filter(
            models.Subscriber.site_id == site.site_id,
            models.Subscriber.unsubscribed_at.is_(None),
            models.Subscriber.is_confirmed == True,
        )
        .scalar()
    ) or 0
    return {
        "site_id": site.site_id,
        "subdomain": site.subdomain,
        "custom_domain": site.custom_domain,
        "custom_subpath": site.custom_subpath,
        "domain_status": site.domain_status.value if hasattr(site.domain_status, "value") else str(site.domain_status),
        "nav_blog_name": site.nav_blog_name,
        "template_id": site.template_id,
        "created_at": site.created_at,
        "post_count": post_count,
        "subscriber_count": subscriber_count,
    }


@router.get("/", response_model=List[site_schema.SiteSummary], status_code=status.HTTP_200_OK)
def list_sites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sites = (
        db.query(models.Site)
        .filter(models.Site.user_id == current_user.user_id)
        .order_by(models.Site.created_at.asc())
        .all()
    )
    return [_site_summary_out(db, s) for s in sites]


@router.post("/", response_model=site_schema.SiteSummary, status_code=status.HTTP_201_CREATED)
def create_site(
    request: site_schema.SiteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    raw_subdomain = request.subdomain.strip().lower()
    cleaned_subdomain = slugify(raw_subdomain, lowercase=True)

    if not cleaned_subdomain or len(cleaned_subdomain) < 3 or len(cleaned_subdomain) > 48:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subdomain must be between 3 and 48 alphanumeric characters.",
        )

    if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", cleaned_subdomain):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subdomain can only contain lowercase letters, numbers, and hyphens.",
        )

    if cleaned_subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subdomain '{cleaned_subdomain}' is reserved.",
        )

    # Check uniqueness
    existing_site = db.query(models.Site).filter(models.Site.subdomain == cleaned_subdomain).first()
    if existing_site:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain is already taken.",
        )

    new_site = models.Site(
        user_id=current_user.user_id,
        subdomain=cleaned_subdomain,
        nav_blog_name=request.nav_blog_name.strip() if request.nav_blog_name else cleaned_subdomain,
    )
    db.add(new_site)
    db.flush()

    # Create default author for this site
    new_author = models.Author(
        site_id=new_site.site_id,
        name=current_user.name,
        slug=cleaned_subdomain,
    )
    db.add(new_author)
    db.flush()

    # Claim username/subdomain
    utils.claim_username_or_raise(db, current_user.user_id, cleaned_subdomain)

    # Provision Umami Analytics if enabled
    try:
        umami_client = UmamiClient()
        if umami_client.configured:
            domain = f"{cleaned_subdomain}.{settings.ugc_domain}"
            website_res = umami_client.create_website_sync(
                name=f"{current_user.name} ({cleaned_subdomain})",
                domain=domain,
            )
            if isinstance(website_res, dict):
                new_site.umami_website_id = website_res.get("id")
            elif website_res:
                new_site.umami_website_id = str(website_res)
    except Exception:
        pass

    db.commit()
    db.refresh(new_site)

    schedule_tenant_purge(background_tasks, new_site)
    return _site_summary_out(db, new_site)


@router.get("/{site_id}", response_model=site_schema.SiteSummary, status_code=status.HTTP_200_OK)
def get_site(
    site_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    site = (
        db.query(models.Site)
        .filter(models.Site.site_id == site_id, models.Site.user_id == current_user.user_id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    return _site_summary_out(db, site)


@router.delete("/{site_id}", status_code=status.HTTP_200_OK)
def delete_site(
    site_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total_sites = (
        db.query(func.count(models.Site.site_id))
        .filter(models.Site.user_id == current_user.user_id)
        .scalar()
    ) or 0

    if total_sites <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your only site.",
        )

    site = (
        db.query(models.Site)
        .filter(models.Site.site_id == site_id, models.Site.user_id == current_user.user_id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    # Delete media objects from storage (R2/local) before DB rows disappear
    # via the DB-level ON DELETE CASCADE foreign keys.
    for media in db.query(models.BlogMedia).filter(models.BlogMedia.site_id == site.site_id).all():
        try:
            delete_media(media.storage_key)
        except Exception:
            pass
    for media in db.query(models.PageMedia).filter(models.PageMedia.site_id == site.site_id).all():
        try:
            delete_media(media.storage_key)
        except Exception:
            pass

    # Release the username claim so the subdomain becomes available again.
    db.query(models.UsernameClaim).filter(
        models.UsernameClaim.username == site.subdomain
    ).delete(synchronize_session=False)

    # Remaining children (blogs, pages, categories, blog_categories, media,
    # subscribers, email_logs, authors) are removed by ON DELETE CASCADE.
    db.delete(site)
    db.commit()

    schedule_tenant_purge(background_tasks, site)
    return {"message": "Site deleted successfully"}


@router.get("/code-injection", response_model=site_schema.CodeInjectionSettings, status_code=status.HTTP_200_OK)
def get_code_injection(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    return {
        "custom_head_code": current_site.custom_head_code,
        "custom_body_code": current_site.custom_body_code,
        "custom_css": current_site.custom_css,
    }


@router.patch("/code-injection", response_model=site_schema.CodeInjectionSettings, status_code=status.HTTP_200_OK)
def update_code_injection(
    request: site_schema.CodeInjectionUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    update_data = request.model_dump(exclude_unset=True)
    if "custom_head_code" in update_data:
        current_site.custom_head_code = update_data["custom_head_code"]
    if "custom_body_code" in update_data:
        current_site.custom_body_code = update_data["custom_body_code"]
    if "custom_css" in update_data:
        current_site.custom_css = update_data["custom_css"]

    db.commit()
    db.refresh(current_site)

    schedule_tenant_purge(background_tasks, current_site)
    return {
        "custom_head_code": current_site.custom_head_code,
        "custom_body_code": current_site.custom_body_code,
        "custom_css": current_site.custom_css,
    }
