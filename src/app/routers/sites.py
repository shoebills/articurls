from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from slugify import slugify
from typing import List
import uuid

from .. import models
from ..database import get_db
from ..schemas import site as site_schema
from ..security.oauth2 import get_current_user, get_current_site
from ..cache.service import schedule_tenant_purge, purge_tenant_now
from ..storage.service import (
    delete_media,
    delete_media_by_url,
    fetch_remote_image,
    get_media_data,
    save_media_bytes,
)
from ..config import settings
from ..umami.client import UmamiClient, UmamiError
from ..utils.rate_limit import check_rate_limit_ip, check_rate_limit_user
from ..utils.subdomains import subdomain_validation_failure

router = APIRouter(
    tags=["Sites"],
    prefix="/sites",
)

_SUBDOMAIN_CHECK_IP_LIMIT = 30
_SUBDOMAIN_CHECK_IP_WINDOW = 60
_SUBDOMAIN_CHECK_IP_BURST = 10

_SITE_LIFECYCLE_LIMIT = 5
_SITE_LIFECYCLE_WINDOW = 3600
_SITE_LIFECYCLE_BURST = 3

_SITE_SETTINGS_LIMIT = 30
_SITE_SETTINGS_WINDOW = 60
_SITE_SETTINGS_BURST = 15


def _site_summary_out(db: Session, site: models.Site) -> dict:
    post_count = (
        db.query(func.count(models.Blog.blog_id))
        .filter(models.Blog.site_id == site.site_id)
        .scalar()
    ) or 0
    subscriber_count = (
        db.query(func.count(models.Subscriber.subscriber_id))
        .filter(models.Subscriber.site_id == site.site_id)
        .scalar()
    ) or 0
    return {
        "site_id": site.site_id,
        "subdomain": site.subdomain,
        "custom_domain": site.custom_domain,
        "custom_subpath": site.custom_subpath,
        "domain_status": site.domain_status.value if hasattr(site.domain_status, "value") else str(site.domain_status),
        "site_name": site.site_name,
        "template_id": site.template_id,
        "timezone": site.timezone,
        "favicon_url": site.favicon_url,
        "created_at": site.created_at,
        "post_count": post_count,
        "subscriber_count": subscriber_count,
        "onboarding_completed": bool(site.onboarding_completed),
    }


@router.get("/check-availability", status_code=status.HTTP_200_OK)
def check_subdomain_availability(
    request: Request,
    subdomain: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    check_rate_limit_ip(
        request,
        "subdomain-check",
        _SUBDOMAIN_CHECK_IP_LIMIT,
        _SUBDOMAIN_CHECK_IP_WINDOW,
        burst=_SUBDOMAIN_CHECK_IP_BURST,
    )
    raw_subdomain = subdomain.strip().lower()
    cleaned_subdomain = slugify(raw_subdomain, lowercase=True)

    failure = subdomain_validation_failure(cleaned_subdomain)
    if failure:
        reason, _ = failure
        return {"available": False, "subdomain": cleaned_subdomain, "reason": reason}

    existing_site = db.query(models.Site).filter(models.Site.subdomain == cleaned_subdomain).first()
    if existing_site:
        return {"available": False, "subdomain": cleaned_subdomain, "reason": "Already taken."}

    return {"available": True, "subdomain": cleaned_subdomain}


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
async def create_site(
    request: site_schema.SiteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_rate_limit_user(
        "site-create",
        current_user.user_id,
        _SITE_LIFECYCLE_LIMIT,
        _SITE_LIFECYCLE_WINDOW,
        burst=_SITE_LIFECYCLE_BURST,
    )
    raw_subdomain = request.subdomain.strip().lower()
    cleaned_subdomain = slugify(raw_subdomain, lowercase=True)

    failure = subdomain_validation_failure(cleaned_subdomain)
    if failure:
        detail, http_status = failure
        raise HTTPException(status_code=http_status, detail=detail)

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
        site_name=request.site_name.strip() if request.site_name else cleaned_subdomain,
        timezone=request.timezone,
    )
    if request.template_id in ("standard",):
        new_site.template_id = request.template_id
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

    if current_user.profile_image_url:
        stored_data = get_media_data(current_user.profile_image_url)
        if stored_data:
            img_bytes, ct = stored_data
            author_stored = save_media_bytes(
                img_bytes,
                category="authors",
                content_type=ct or "image/jpeg",
                site_id=new_site.site_id,
                entity_id=new_author.author_id,
            )
            new_author.profile_image_url = author_stored.url
        elif current_user.profile_image_url.startswith(("http://", "https://")):
            remote_img = await fetch_remote_image(current_user.profile_image_url)
            if remote_img:
                img_bytes, ct = remote_img
                author_stored = save_media_bytes(
                    img_bytes,
                    category="authors",
                    content_type=ct,
                    site_id=new_site.site_id,
                    entity_id=new_author.author_id,
                )
                new_author.profile_image_url = author_stored.url
            else:
                new_author.profile_image_url = current_user.profile_image_url

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
    check_rate_limit_user(
        "site-settings",
        current_user.user_id,
        _SITE_SETTINGS_LIMIT,
        _SITE_SETTINGS_WINDOW,
        burst=_SITE_SETTINGS_BURST,
    )
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


@router.post("/cache/purge", status_code=status.HTTP_200_OK)
async def purge_site_cache(
    current_user: models.User = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    """Manually invalidate all cached copies of this publication (edge + data cache)."""
    check_rate_limit_user("cache-purge", current_user.user_id, 10, 3600, burst=5)
    result = await purge_tenant_now(current_site)
    return result


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


@router.patch("/{site_id}/onboarding", response_model=site_schema.SiteSummary, status_code=status.HTTP_200_OK)
def update_site_onboarding(
    site_id: uuid.UUID,
    request: site_schema.SiteOnboardingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_rate_limit_user(
        "site-settings",
        current_user.user_id,
        _SITE_SETTINGS_LIMIT,
        _SITE_SETTINGS_WINDOW,
        burst=_SITE_SETTINGS_BURST,
    )
    site = (
        db.query(models.Site)
        .filter(models.Site.site_id == site_id, models.Site.user_id == current_user.user_id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    site.onboarding_completed = request.onboarding_completed
    db.commit()
    db.refresh(site)
    return _site_summary_out(db, site)


@router.delete("/{site_id}", status_code=status.HTTP_200_OK)
def delete_site(
    site_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    check_rate_limit_user(
        "site-delete",
        current_user.user_id,
        _SITE_LIFECYCLE_LIMIT,
        _SITE_LIFECYCLE_WINDOW,
        burst=_SITE_LIFECYCLE_BURST,
    )
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
    for author in db.query(models.Author).filter(models.Author.site_id == site.site_id).all():
        delete_media_by_url(author.profile_image_url)
    for branding_url in (site.logo_url, site.favicon_url, site.og_image_url):
        delete_media_by_url(branding_url)

    # Remaining children (blogs, pages, categories, blog_categories, media,
    # subscribers, authors) are removed by ON DELETE CASCADE.
    db.delete(site)
    db.commit()

    schedule_tenant_purge(background_tasks, site)
    return {"message": "Site deleted successfully"}
