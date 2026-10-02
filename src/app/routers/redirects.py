from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi import BackgroundTasks
import uuid

from .. import models, utils
from ..database import get_db
from ..schemas import redirects as redirect_schema
from ..security.oauth2 import get_current_site, get_current_user
from ..cache.service import schedule_tenant_purge
from ..utils.rate_limit import check_rate_limit_user
from ..config import settings

router = APIRouter(tags=["Redirects"])

_REDIRECT_CREATE_LIMIT = 30
_REDIRECT_RATE_WINDOW = 60
_MAX_REDIRECT_CHAIN = 5


def _redirect_out(db_redirect: models.Redirect) -> dict:
    return {
        "redirect_id": db_redirect.redirect_id,
        "source_path": db_redirect.source_path,
        "target_url": db_redirect.target_url,
        "type": db_redirect.type.value if hasattr(db_redirect.type, "value") else str(db_redirect.type),
        "created_at": db_redirect.created_at,
        "updated_at": db_redirect.updated_at,
    }


def _normalize_lookup_path(raw: str | None) -> Optional[str]:
    """Lenient normalization for incoming request paths (matching only)."""
    if not raw:
        return None
    path = raw.strip()
    if not path.startswith("/"):
        return None
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
        if not path:
            path = "/"
    return path


def _ensure_no_conflict(db: Session, site_id, source_path: str, exclude_id=None) -> None:
    query = db.query(models.Redirect).filter(
        models.Redirect.site_id == site_id,
        models.Redirect.source_path == source_path,
    )
    if exclude_id is not None:
        query = query.filter(models.Redirect.redirect_id != exclude_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A redirect with this source path already exists.",
        )


def _reject_self_loop(source_path: str, target_url: str) -> None:
    if target_url.startswith("/") and target_url == source_path:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Source and target must be different.",
        )


def resolve_redirect_chain(db: Session, site_id, path: str):
    """Walk a redirect chain (max 5 hops) and return (target_url, type_value).

    The status code of the FIRST matched rule is kept — it describes the
    permanence of the originally requested URL. Returns None when there is
    no redirect, the chain loops, or it exceeds the hop limit.
    """
    current = path
    first_type = None
    visited = {path}
    for _ in range(_MAX_REDIRECT_CHAIN + 1):
        row = (
            db.query(models.Redirect)
            .filter(models.Redirect.site_id == site_id, models.Redirect.source_path == current)
            .first()
        )
        if row is None:
            return None
        if first_type is None:
            first_type = row.type.value if hasattr(row.type, "value") else str(row.type)
        target = row.target_url
        if not target.startswith("/"):
            return target, first_type
        if target in visited:
            return None
        visited.add(target)
        current = target
    return None


@router.get("/redirects", response_model=List[redirect_schema.RedirectOut], status_code=status.HTTP_200_OK)
def list_redirects(
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    rows = (
        db.query(models.Redirect)
        .filter(models.Redirect.site_id == current_site.site_id)
        .order_by(models.Redirect.created_at.desc(), models.Redirect.source_path.asc())
        .all()
    )
    return [_redirect_out(r) for r in rows]


@router.post("/redirects", response_model=redirect_schema.RedirectOut, status_code=status.HTTP_201_CREATED)
def create_redirect(
    request: redirect_schema.RedirectCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    current_site: models.Site = Depends(get_current_site),
):
    check_rate_limit_user("redirect-create", current_user.user_id, _REDIRECT_CREATE_LIMIT, _REDIRECT_RATE_WINDOW)

    _reject_self_loop(request.source_path, request.target_url)
    _ensure_no_conflict(db, current_site.site_id, request.source_path)

    db_redirect = models.Redirect(
        site_id=current_site.site_id,
        source_path=request.source_path,
        target_url=request.target_url,
        type=models.RedirectType(request.type),
    )
    db.add(db_redirect)
    db.commit()
    db.refresh(db_redirect)

    schedule_tenant_purge(background_tasks, current_site)
    return _redirect_out(db_redirect)


@router.patch("/redirects/{redirect_id}", response_model=redirect_schema.RedirectOut, status_code=status.HTTP_200_OK)
def update_redirect(
    redirect_id: uuid.UUID,
    request: redirect_schema.RedirectUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    db_redirect = (
        db.query(models.Redirect)
        .filter(
            models.Redirect.redirect_id == redirect_id,
            models.Redirect.site_id == current_site.site_id,
        )
        .first()
    )
    if not db_redirect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redirect not found")

    update_data = request.model_dump(exclude_unset=True)
    source_path = update_data.get("source_path", db_redirect.source_path)
    target_url = update_data.get("target_url", db_redirect.target_url)

    _reject_self_loop(source_path, target_url)
    _ensure_no_conflict(db, current_site.site_id, source_path, exclude_id=db_redirect.redirect_id)

    if "source_path" in update_data:
        db_redirect.source_path = source_path
    if "target_url" in update_data:
        db_redirect.target_url = target_url
    if "type" in update_data:
        db_redirect.type = models.RedirectType(update_data["type"])

    db.commit()
    db.refresh(db_redirect)

    schedule_tenant_purge(background_tasks, current_site)
    return _redirect_out(db_redirect)


@router.delete("/redirects/{redirect_id}", status_code=status.HTTP_200_OK)
def delete_redirect(
    redirect_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_site: models.Site = Depends(get_current_site),
):
    db_redirect = (
        db.query(models.Redirect)
        .filter(
            models.Redirect.redirect_id == redirect_id,
            models.Redirect.site_id == current_site.site_id,
        )
        .first()
    )
    if not db_redirect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redirect not found")

    db.delete(db_redirect)
    db.commit()

    schedule_tenant_purge(background_tasks, current_site)
    return {"message": "Redirect deleted"}


@router.get("/internal/redirects", response_model=List[redirect_schema.RedirectOut], status_code=status.HTTP_200_OK)
def internal_list_redirects(subdomain: str, request: Request, db: Session = Depends(get_db)):
    """Internal endpoint for Next.js SEO routes (sitemap filtering)."""
    secret = settings.internal_api_secret
    if not secret or request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    site = db.query(models.Site).filter(models.Site.subdomain == subdomain).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    rows = (
        db.query(models.Redirect)
        .filter(models.Redirect.site_id == site.site_id)
        .all()
    )
    return [_redirect_out(r) for r in rows]


@router.get("/{subdomain}/redirect", status_code=status.HTTP_200_OK)
def resolve_redirect(
    subdomain: str,
    path: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Public redirect lookup for the content renderer (exact path match)."""
    db_site, canonical_subdomain = utils.resolve_subdomain_to_current(db, subdomain)
    if db_site and canonical_subdomain != utils.normalize_subdomain(subdomain):
        return utils.permanent_subdomain_redirect(str(request.url.path), canonical_subdomain, request.url.query)
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    normalized = _normalize_lookup_path(path)
    if normalized is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No redirect")

    resolved = resolve_redirect_chain(db, db_site.site_id, normalized)
    if resolved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No redirect")

    target_url, redirect_type = resolved
    return {"target_url": target_url, "type": redirect_type}
