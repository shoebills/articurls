import uuid
from fastapi import Depends, APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import subscribers
from ..security.oauth2 import verify_unsubscribe_token, create_sub_confirm_token, verify_sub_confirm_token, get_current_user, get_current_site
from ..email.service import send_sub_confirmation_email
from ..utils import normalize_email
from ..utils.rate_limit import check_rate_limit_ip_and_email


router = APIRouter(
    tags=["Subscriber"]
    )


_SUBSCRIBE_IP_LIMIT = 5
_SUBSCRIBE_IP_WINDOW = 600       # 10 minutes
_SUBSCRIBE_EMAIL_LIMIT = 3
_SUBSCRIBE_EMAIL_WINDOW = 3600   # 1 hour


@router.post("/subscribe/{user_name}", status_code=status.HTTP_200_OK)
def subscribe_blog(user_name: str, request: Request, body: subscribers.Subscribe, db: Session = Depends(get_db)):

    email = normalize_email(str(body.email))

    check_rate_limit_ip_and_email(
        request, "subscribe", email,
        _SUBSCRIBE_IP_LIMIT, _SUBSCRIBE_IP_WINDOW,
        _SUBSCRIBE_EMAIL_LIMIT, _SUBSCRIBE_EMAIL_WINDOW,
    )

    db_site = db.query(models.Site).filter(models.Site.subdomain == user_name).first()

    if not db_site:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"User with username {user_name} doesn't exist")

    if not db_site.subscriber_collection_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscriptions are unavailable for this blog",
        )
     
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.email == email, models.Subscriber.site_id == db_site.site_id).first()

    # already active subscriber
    if db_subscriber and db_subscriber.unsubscribed_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed to this user"
        )

    # resubscribe
    if db_subscriber and db_subscriber.unsubscribed_at:
        db_subscriber.unsubscribed_at = None
        db.commit()
        db.refresh(db_subscriber)
        return {"message": "Subscribed again"}
    
    new_subscriber = models.Subscriber(email=email, 
                                       site_id=db_site.site_id)

    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    token = create_sub_confirm_token(new_subscriber.subscriber_id, new_subscriber.site_id)
    send_sub_confirmation_email(new_subscriber.email, db_site.authors[0].name if db_site.authors else "Author", token)

    return {"message": "Please check your email to confirm subscription"}

@router.get("/confirm-subscription", status_code=status.HTTP_200_OK)
def confirm_subscription(token: str, db: Session = Depends(get_db)):

    try:
        payload = verify_sub_confirm_token(token)

    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired confirmation link")
    
    target_site_id = payload.get("site_id") or payload.get("user_id")
    try:
        sub_id = uuid.UUID(str(payload["subscriber_id"]))
        site_id = uuid.UUID(str(target_site_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid confirmation link")

    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.subscriber_id == sub_id, models.Subscriber.site_id == site_id).first()

    if not db_subscriber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")

    if db_subscriber.is_confirmed:
        return {"message": "Already confirmed"}
    
    db_subscriber.is_confirmed = True

    db.commit()
    db.refresh(db_subscriber)

    return {"message": "Email verified successfully"}

@router.post("/unsubscribe/{user_name}", status_code=status.HTTP_200_OK)
def unsubscribe_blog(user_name: str, request: subscribers.Unsubscribe, db: Session = Depends(get_db)):

    db_site = db.query(models.Site).filter(models.Site.subdomain == user_name).first()

    if not db_site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with username: {user_name} doesn't exist"
        )

    db_subscriber = (db.query(models.Subscriber).filter(models.Subscriber.email == request.email, models.Subscriber.site_id == db_site.site_id).first())

    if not db_subscriber:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscriber not found"
        )

    if db_subscriber.unsubscribed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already unsubscribed"
        )

    db_subscriber.unsubscribed_at = func.now()

    db.commit()

    return {"message": "Successfully unsubscribed"}

@router.get("/unsubscribe", status_code=status.HTTP_200_OK)
def unsubscribe_via_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = verify_unsubscribe_token(token)

    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired unsubscriber link")
    
    target_site_id = payload.get("site_id") or payload.get("user_id")
    try:
        sub_id = uuid.UUID(str(payload["subscriber_id"]))
        site_id = uuid.UUID(str(target_site_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid unsubscriber link")

    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.subscriber_id == sub_id, models.Subscriber.site_id == site_id).first()

    if not db_subscriber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcriber not found")
    
    if db_subscriber.unsubscribed_at:
        return {"message": "Already unsubscribed"}
    
    db_subscriber.unsubscribed_at = func.now()
    db.commit()

    return {"message": "Successfully unsubscribed"}

@router.get("/list", status_code=status.HTTP_200_OK)
def list_subscribers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):

    base_query = db.query(models.Subscriber).filter(
        models.Subscriber.site_id == current_site.site_id
    )

    total = base_query.count()

    db_subscribers = (
        base_query.order_by(models.Subscriber.subscribed_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "email": sub.email,
                "subscribed_at": sub.subscribed_at.isoformat() if sub.subscribed_at else None,
                "is_confirmed": sub.is_confirmed,
                "unsubscribed_at": sub.unsubscribed_at.isoformat() if sub.unsubscribed_at else None,
            }
            for sub in db_subscribers
        ],
        "total": total,
        "page": page,
        "total_pages": max(1, -(-total // limit)),
    }