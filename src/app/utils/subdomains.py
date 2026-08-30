import re

from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from .text import normalize_subdomain


SUBDOMAIN_MIN_LEN = 3
SUBDOMAIN_MAX_LEN = 30
SUBDOMAIN_RE = re.compile(r"^[a-z0-9_-]+$")
RESERVED_SUBDOMAINS = {
    "login",
    "signup",
    "verify",
    "dashboard",
    "analytics",
    "billing",
    "settings",
    "forgot-password",
    "reset-password",
    "api",
    "_next",
    "favicon.ico",
}


def validate_subdomain_or_raise(raw: str | None) -> str:
    value = normalize_subdomain(raw)
    if not value:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Subdomain is required")
    if len(value) < SUBDOMAIN_MIN_LEN or len(value) > SUBDOMAIN_MAX_LEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Subdomain must be {SUBDOMAIN_MIN_LEN}-{SUBDOMAIN_MAX_LEN} characters.",
        )
    if not SUBDOMAIN_RE.fullmatch(value):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subdomain may only contain lowercase letters, numbers, underscore, and hyphen.",
        )
    if value in RESERVED_SUBDOMAINS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subdomain is reserved.")
    return value


def resolve_subdomain_to_current(db: Session, requested_subdomain_raw: str) -> tuple[models.Site | None, str]:
    requested = normalize_subdomain(requested_subdomain_raw)
    if not requested:
        return None, ""

    db_site = db.query(models.Site).filter(models.Site.subdomain == requested).first()
    if db_site:
        return db_site, normalize_subdomain(db_site.subdomain)

    # Subdomains are permanent; an unknown subdomain is a 404, never a redirect.
    return None, requested


def permanent_subdomain_redirect(path: str, canonical_subdomain: str, query_string: str = "") -> RedirectResponse:
    segments = path.split("/")
    if len(segments) > 1:
        segments[1] = canonical_subdomain
    target = "/".join(segments) or f"/{canonical_subdomain}"
    if query_string:
        target = f"{target}?{query_string}"
    return RedirectResponse(url=target, status_code=status.HTTP_301_MOVED_PERMANENTLY)