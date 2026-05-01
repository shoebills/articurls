from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..database import get_db
from .. import models
from ..security.oauth2 import get_current_user
from ..utils import require_pro
from ..config import settings
from .schemas import DomainIn, DomainOut, DomainVerifyOut, DomainLookupOut
from .utils import normalize_hostname, validate_hostname

router = APIRouter(tags=["Domain"])


# ── Authenticated user endpoints ─────────────────────────────────────────────

@router.post("/settings/domain", response_model=DomainOut, status_code=status.HTTP_200_OK)
def set_domain(
    body: DomainIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    hostname = normalize_hostname(body.hostname)
    validate_hostname(hostname)

    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.custom_domain = hostname
    db_user.domain_status = models.DomainStatus.PENDING
    db_user.is_domain_verified = False
    db_user.cloudflare_hostname_id = None
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This domain is already in use by another account.",
        )

    db.refresh(db_user)
    return db_user


@router.get("/settings/domain", response_model=DomainOut, status_code=status.HTTP_200_OK)
def get_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user


@router.post("/settings/domain/verify", response_model=DomainVerifyOut, status_code=status.HTTP_200_OK)
def verify_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _pro=Depends(require_pro),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not db_user.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No custom domain configured.",
        )

    if db_user.domain_status == models.DomainStatus.ACTIVE:
        return {"verification_status": "already_verified", "domain_status": db_user.domain_status}

    # Cloudflare integration will be wired here in a later phase.
    return {"verification_status": "verification_pending", "domain_status": db_user.domain_status}


@router.delete("/settings/domain", status_code=status.HTTP_200_OK)
def delete_domain(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db_user = db.query(models.User).filter(models.User.user_id == current_user.user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.custom_domain = None
    db_user.domain_status = models.DomainStatus.NONE
    db_user.is_domain_verified = False
    db_user.cloudflare_hostname_id = None
    db_user.verified_at = None
    db_user.grace_started_at = None
    db_user.grace_expires_at = None

    db.commit()
    return {"message": "Custom domain removed."}


# ── Internal endpoint (middleware → API) ─────────────────────────────────────

@router.get("/internal/domain-lookup", response_model=DomainLookupOut, status_code=status.HTTP_200_OK)
def domain_lookup(hostname: str, request: Request, db: Session = Depends(get_db)):
    secret = settings.internal_api_secret
    if secret and request.headers.get("x-internal-secret") != secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    normalized = normalize_hostname(hostname)
    db_user = (
        db.query(models.User)
        .filter(models.User.custom_domain.ilike(normalized))
        .first()
    )

    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    return {"username": db_user.user_name, "domain_status": db_user.domain_status}
