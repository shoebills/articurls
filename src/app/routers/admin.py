from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from .. import models
from ..database import get_db
from ..security.oauth2 import get_current_user
from ..schemas import user as user_schema
from ..utils import (
    RequestContext,
    apply_username_change_or_raise,
    assert_admin_email,
)


router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(current_user=Depends(get_current_user)):
    assert_admin_email(current_user.email)
    return current_user


@router.get("/users/search", status_code=status.HTTP_200_OK)
def search_users(
    q: str = Query(min_length=1),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    needle = q.strip()
    if not needle:
        return []
    return (
        db.query(models.User)
        .filter(
            or_(
                func.lower(models.User.email).contains(needle.lower()),
                func.lower(models.User.user_name).contains(needle.lower()),
                func.lower(models.User.name).contains(needle.lower()),
            )
        )
        .order_by(models.User.created_at.desc())
        .limit(25)
        .all()
    )


@router.get("/users/{user_id}", status_code=status.HTTP_200_OK)
def admin_user_summary(user_id: int, db: Session = Depends(get_db), current_user=Depends(_require_admin)):
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).first()
    tx_count = db.query(func.count(models.Transactions.transaction_id)).filter(models.Transactions.user_id == user_id).scalar() or 0
    pending_req = (
        db.query(func.count(models.UsernameChangeRequest.request_id))
        .filter(models.UsernameChangeRequest.user_id == user_id, models.UsernameChangeRequest.status == "pending")
        .scalar()
        or 0
    )
    return {"user": db_user, "subscription": sub, "transaction_count": tx_count, "pending_username_requests": pending_req}


@router.get("/users/{user_id}/username-history", response_model=list[user_schema.UsernameChangeRequestOut], status_code=status.HTTP_200_OK)
def admin_username_request_history(user_id: int, db: Session = Depends(get_db), current_user=Depends(_require_admin)):
    return (
        db.query(models.UsernameChangeRequest)
        .filter(models.UsernameChangeRequest.user_id == user_id)
        .order_by(models.UsernameChangeRequest.created_at.desc())
        .all()
    )


@router.get("/users/{user_id}/username-audit", status_code=status.HTTP_200_OK)
def admin_username_audit(user_id: int, db: Session = Depends(get_db), current_user=Depends(_require_admin)):
    return (
        db.query(models.UsernameChangeAudit)
        .filter(models.UsernameChangeAudit.user_id == user_id)
        .order_by(models.UsernameChangeAudit.created_at.desc())
        .all()
    )


@router.patch("/users/{user_id}/username", response_model=user_schema.UserSettings, status_code=status.HTTP_202_ACCEPTED)
def admin_override_username(
    user_id: int,
    request: user_schema.AdminUsernameChange,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    apply_username_change_or_raise(
        db,
        db_user=db_user,
        new_username_raw=request.user_name,
        actor_user_id=current_user.user_id,
        actor_email=current_user.email,
        request_context=RequestContext(ip=None, user_agent="admin_api"),
        is_admin_override=True,
        reason=(request.reason or "").strip() or "admin_override",
    )
    db.commit()
    db.refresh(db_user)
    setattr(db_user, "is_admin", True)
    return db_user


@router.get("/username-change-requests", response_model=list[user_schema.UsernameChangeRequestOut], status_code=status.HTTP_200_OK)
def admin_list_username_change_requests(
    status_filter: str = Query("pending", alias="status"),
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    q = db.query(models.UsernameChangeRequest)
    if status_filter in {"pending", "approved", "rejected"}:
        q = q.filter(models.UsernameChangeRequest.status == status_filter)
    return q.order_by(models.UsernameChangeRequest.created_at.desc()).all()


@router.patch("/username-change-requests/{request_id}", response_model=user_schema.UsernameChangeRequestOut, status_code=status.HTTP_200_OK)
def admin_review_username_change_request(
    request_id: int,
    payload: user_schema.UsernameChangeRequestReview,
    db: Session = Depends(get_db),
    current_user=Depends(_require_admin),
):
    row = db.query(models.UsernameChangeRequest).filter(models.UsernameChangeRequest.request_id == request_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if row.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request already reviewed")

    row.status = payload.status
    row.admin_note = (payload.admin_note or "").strip() or None
    row.reviewed_by_user_id = current_user.user_id
    row.reviewed_at = datetime.now(timezone.utc)

    if payload.status == "approved":
        target_user = db.query(models.User).filter(models.User.user_id == row.user_id).first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        apply_username_change_or_raise(
            db,
            db_user=target_user,
            new_username_raw=row.desired_username,
            actor_user_id=current_user.user_id,
            actor_email=current_user.email,
            request_context=RequestContext(ip=None, user_agent="admin_request_review"),
            is_admin_override=True,
            reason=f"request:{row.request_id}",
        )

    db.commit()
    db.refresh(row)
    return row


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
def admin_retry_payment_webhook(webhook_id: int, db: Session = Depends(get_db), current_user=Depends(_require_admin)):
    row = db.query(models.PaymentWebhooks).filter(models.PaymentWebhooks.webhook_id == webhook_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")
    row.processed = False
    db.commit()
    return {"detail": "Webhook marked for retry", "webhook_id": webhook_id}
