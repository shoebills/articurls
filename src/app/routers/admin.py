from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session
import uuid

from .. import models
from ..database import get_db
from ..security.oauth2 import get_current_user
from ..schemas import user as user_schema
from ..config import settings
from ..utils import (
    RequestContext,
    apply_username_change_or_raise,
    assert_admin_email,
)
from ..utils.serialization import user_settings_out


router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(current_user=Depends(get_current_user)):
    assert_admin_email(current_user.email)
    return current_user


@router.get("/users", status_code=status.HTTP_200_OK)
def list_users(
    q: str = Query("", description="Search by username/email/name"),
    plan: str = Query("all", description="all|inactive|pro"),
    sort: str = Query("latest", description="latest|oldest"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    needle = q.strip().lower()
    query = (
        db.query(models.User, models.Subscriptions, models.Site)
        .outerjoin(models.Subscriptions, models.Subscriptions.user_id == models.User.user_id)
        .outerjoin(models.Site, models.Site.user_id == models.User.user_id)
    )
    if needle:
        query = query.filter(
            or_(
                func.lower(models.User.email).contains(needle),
                func.lower(models.Site.subdomain).contains(needle),
                func.lower(models.User.name).contains(needle),
            )
        )
    if plan == "pro":
        query = query.filter(
            and_(
                models.Subscriptions.plan_type.in_(["pro", "lifetime"]),
                models.Subscriptions.status.in_(["active", "past_due"]),
            )
        )
    elif plan == "inactive":
        query = query.filter(
            or_(
                models.Subscriptions.subscription_id.is_(None),
                models.Subscriptions.plan_type.notin_(["pro", "lifetime"]),
                models.Subscriptions.status.notin_(["active", "past_due"]),
            )
        )

    if sort == "oldest":
        query = query.order_by(models.User.created_at.asc().nulls_last())
    else:
        query = query.order_by(models.User.created_at.desc().nulls_last())

    rows = query.offset(offset).limit(limit).all()
    output = []
    for db_user, sub, site in rows:
        is_pro = bool(sub and sub.plan_type in ("pro", "lifetime") and sub.status in {"active", "past_due"})
        output.append(
            {
                "user_id": db_user.user_id,
                "name": db_user.name,
                "user_name": site.subdomain if site else "",
                "email": db_user.email,
                "created_at": db_user.created_at,
                "plan": "pro" if is_pro else "inactive",
            }
        )
    return output


@router.patch("/users/{user_id}/username", response_model=user_schema.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def admin_override_username(
    user_id: uuid.UUID,
    request: user_schema.AdminUsernameChange,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db_site = db.query(models.Site).filter(models.Site.user_id == user_id).order_by(models.Site.site_id.asc()).first()
    if not db_site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found for user")

    apply_username_change_or_raise(
        db,
        db_site=db_site,
        new_username_raw=request.user_name,
        actor_user_id=current_user.user_id,
        actor_email=current_user.email,
        request_context=RequestContext(ip=None, user_agent="admin_api"),
        is_admin_override=True,
        reason=(request.reason or "").strip() or "admin_override",
    )
    db.commit()
    db.refresh(db_user)
    db.refresh(db_site)
    return user_settings_out(db, db_user, db_site)


@router.get("/payments", status_code=status.HTTP_200_OK)
def admin_list_payments(
    q: str = Query("", description="Search by username/email/payment id"),
    sort: str = Query("latest", description="latest|oldest"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    query = (
        db.query(models.Transactions, models.User, models.Site)
        .join(models.User, models.User.user_id == models.Transactions.user_id)
        .outerjoin(models.Site, models.Site.user_id == models.User.user_id)
        .filter(models.Transactions.status.notin_(["pending", "failed"]))
    )
    needle = q.strip().lower()
    if needle:
        query = query.filter(
            or_(
                func.lower(models.Site.subdomain).contains(needle),
                func.lower(models.User.email).contains(needle),
                func.lower(models.Transactions.dodo_payment_id).contains(needle),
            )
        )
    if sort == "oldest":
        query = query.order_by(models.Transactions.created_at.asc())
    else:
        query = query.order_by(models.Transactions.created_at.desc())
    rows = query.offset(offset).limit(limit).all()
    return [
        {
            "transaction_id": tx.transaction_id,
            "user_id": usr.user_id,
            "user_name": site.subdomain if site else "",
            "email": usr.email,
            "amount": tx.amount,
            "currency": tx.currency,
            "status": tx.status,
            "dodo_payment_id": tx.dodo_payment_id,
            "created_at": tx.created_at,
        }
        for tx, usr, site in rows
    ]


@router.get("/payments/webhooks", status_code=status.HTTP_200_OK)
def admin_list_payment_webhooks(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    return (
        db.query(models.PaymentWebhooks)
        .order_by(models.PaymentWebhooks.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/payments/webhooks/{webhook_id}/retry", status_code=status.HTTP_200_OK)
def admin_retry_payment_webhook(webhook_id: uuid.UUID, db: Session = Depends(get_db), current_user=Depends(_require_admin)):
    row = db.query(models.PaymentWebhooks).filter(models.PaymentWebhooks.webhook_id == webhook_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    row.processed = False
    db.commit()
    return {"detail": "Webhook marked for retry", "webhook_id": webhook_id}


@router.get("/domains", status_code=status.HTTP_200_OK)
def admin_list_domains(
    q: str = Query("", description="Search by username/email/domain"),
    status_filter: str = Query("all", description="all|active|grace|expired|pending"),
    sort: str = Query("latest", description="latest|oldest"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    """List all custom domains with their status for admin management."""
    query = (
        db.query(models.Site, models.User)
        .join(models.User, models.User.user_id == models.Site.user_id)
        .filter(models.Site.custom_domain.isnot(None))
    )
    
    needle = q.strip().lower()
    if needle:
        query = query.filter(
            or_(
                func.lower(models.Site.subdomain).contains(needle),
                func.lower(models.User.email).contains(needle),
                func.lower(models.Site.custom_domain).contains(needle),
            )
        )
    
    if status_filter in {"active", "grace", "expired", "pending", "none"}:
        query = query.filter(models.Site.domain_status == status_filter)
    
    if sort == "oldest":
        query = query.order_by(models.Site.created_at.asc().nulls_last())
    else:
        query = query.order_by(models.Site.created_at.desc().nulls_last())
    
    rows = query.offset(offset).limit(limit).all()
    
    return [
        {
            "user_id": user.user_id,
            "site_id": site.site_id,
            "user_name": site.subdomain,
            "email": user.email,
            "custom_domain": site.custom_domain,
            "domain_status": site.domain_status,
            "verified_at": site.verified_at,
            "grace_started_at": site.grace_started_at,
            "grace_expires_at": site.grace_expires_at,
            "created_at": site.created_at,
        }
        for site, user in rows
    ]
