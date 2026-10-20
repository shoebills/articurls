from __future__ import annotations

import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..config import settings
from ..database import get_db
from ..domains.utils import (
    invalidate_domain_lookup_cache,
    normalize_hostname,
    purge_domain_lookup_cache,
    reset_domain_columns,
    validate_hostname,
)
from ..domains.router import _remove_vercel_domain
from ..security.oauth2 import get_current_site
from ..subfolder.schemas import SubfolderIn, SubfolderOut
from ..subfolder.snippets import (
    apache_config,
    caddy_config,
    cloudflare_worker,
    nextjs_rewrite,
    nginx_config,
    vercel_rewrite,
)
from ..cache.service import purge_domain_lookup_tags
from ..utils import is_pro_entitled
from ..utils.rate_limit import check_rate_limit_user

router = APIRouter(tags=["Subfolder"])

_SUBPATH_RE = re.compile(r"^/[a-z0-9][a-z0-9\-_/]*$")
_SUBPATH_MAX_LEN = 60

_SUBFOLDER_WRITE_LIMIT = 10
_SUBFOLDER_WRITE_WINDOW = 3600
_SUBFOLDER_WRITE_BURST = 5


def normalize_subpath(raw: str | None) -> str:
    if not raw:
        return "/blog"
    clean = "/" + raw.strip().strip("/").lower()
    return clean if clean != "/" else "/blog"


def validate_subpath(subpath: str) -> None:
    if len(subpath) > _SUBPATH_MAX_LEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subpath is too long.",
        )
    if not _SUBPATH_RE.match(subpath):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subpath can only contain lowercase letters, numbers, hyphens, underscores, and forward slashes.",
        )


@router.get("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
def get_subfolder_settings(
    current_site: models.Site = Depends(get_current_site),
):
    is_active = bool(current_site.custom_domain and current_site.custom_subpath)
    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        is_active=is_active,
    )


@router.post("/settings/subfolder", response_model=SubfolderOut, status_code=status.HTTP_200_OK)
async def update_subfolder_settings(
    body: SubfolderIn,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-write",
        current_site.user_id,
        _SUBFOLDER_WRITE_LIMIT,
        _SUBFOLDER_WRITE_WINDOW,
        burst=_SUBFOLDER_WRITE_BURST,
    )
    if not is_pro_entitled(current_site.user_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom subfolder routing requires an active Pro subscription.",
        )

    domain = normalize_hostname(body.custom_domain)
    validate_hostname(domain)
    subpath = normalize_subpath(body.custom_subpath)
    validate_subpath(subpath)

    existing = db.query(models.Site).filter(
        models.Site.custom_domain == domain,
        models.Site.site_id != current_site.site_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another publication.",
        )

    # Subfolder mode is self-hosted by the customer (reverse proxy), so any
    # prior Vercel registration for the domain is stale and must be removed.
    old_domain = current_site.custom_domain
    if old_domain:
        await _remove_vercel_domain(old_domain)

    current_site.custom_domain = domain
    current_site.custom_subpath = subpath
    current_site.domain_status = models.DomainStatus.ACTIVE
    current_site.domain_dns_instructions = None
    current_site.verified_at = None
    current_site.grace_started_at = None
    current_site.grace_expires_at = None
    db.commit()
    db.refresh(current_site)

    purge_domain_lookup_cache(domain, current_site.subdomain)
    if old_domain and old_domain != domain:
        purge_domain_lookup_cache(old_domain, None)

    from ..umami.service import enqueue_umami_domain_sync

    enqueue_umami_domain_sync(current_site.user_id)

    return SubfolderOut(
        custom_domain=current_site.custom_domain,
        custom_subpath=current_site.custom_subpath,
        is_active=True,
    )


@router.delete("/settings/subfolder", status_code=status.HTTP_200_OK)
async def delete_subfolder_settings(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user(
        "domain-write",
        current_site.user_id,
        _SUBFOLDER_WRITE_LIMIT,
        _SUBFOLDER_WRITE_WINDOW,
        burst=_SUBFOLDER_WRITE_BURST,
    )
    old_domain = current_site.custom_domain
    if old_domain:
        await _remove_vercel_domain(old_domain)

    reset_domain_columns(current_site)
    db.commit()

    hosts = invalidate_domain_lookup_cache(old_domain, current_site.subdomain)
    if hosts:
        background_tasks.add_task(purge_domain_lookup_tags, hosts)

    from ..umami.service import enqueue_umami_domain_sync

    enqueue_umami_domain_sync(current_site.user_id)

    return {"message": "Subfolder settings removed."}


@router.get("/settings/subfolder/snippets", status_code=status.HTTP_200_OK)
def get_subfolder_snippets(
    current_site: models.Site = Depends(get_current_site),
):
    """Generate copy-paste configuration snippets for various reverse proxies."""
    subdomain = current_site.subdomain
    ugc_domain = settings.ugc_domain
    subpath = current_site.custom_subpath or "/blog"
    clean_subpath = "/" + subpath.strip().strip("/")
    domain = current_site.custom_domain or "example.com"

    return {
        "cloudflare": cloudflare_worker(subdomain, ugc_domain, clean_subpath),
        "nextjs": nextjs_rewrite(subdomain, ugc_domain, clean_subpath, domain),
        "vercel": vercel_rewrite(subdomain, ugc_domain, clean_subpath),
        "nginx": nginx_config(subdomain, ugc_domain, clean_subpath),
        "caddy": caddy_config(subdomain, ugc_domain, clean_subpath, domain),
        "apache": apache_config(subdomain, ugc_domain, clean_subpath, domain),
    }
