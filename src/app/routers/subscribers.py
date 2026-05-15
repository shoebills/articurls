import hashlib
from fastapi import Depends, APIRouter, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import subscribers
from ..security.oauth2 import verify_unsubscribe_token, create_sub_confirm_token, verify_sub_confirm_token
from ..email.service import send_sub_confirmation_email
from ..email.scheduling import schedule_welcome_email_after_confirm
from ..redis_client import redis_client
from ..utils import normalize_email, is_pro_entitled


router = APIRouter(
    tags=["Subscriber"]
    )


# ---------------------------------------------------------------------------
# Subscribe endpoint rate limits
# IP limit:    5 attempts per IP per 10 minutes   — slows single-source abuse
# Email limit: 3 attempts per email per hour      — stops inbox-flooding attacks
#              (email is hashed before use as key — no PII stored in Redis)
# Both fail open if Redis is unavailable.
# ---------------------------------------------------------------------------
_IP_LIMIT = 5
_IP_WINDOW = 600       # 10 minutes
_EMAIL_LIMIT = 3
_EMAIL_WINDOW = 3600   # 1 hour


def _check_subscribe_rate_limits(ip: str, email: str) -> None:
    try:
        # IP-based limit
        ip_key = f"rl:subscribe:ip:{ip}"
        ip_count = redis_client.incr(ip_key)
        if ip_count == 1:
            redis_client.expire(ip_key, _IP_WINDOW)
        if ip_count > _IP_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
            )

        # Email-based limit (hash email so no PII sits in Redis)
        email_hash = hashlib.sha256(email.encode()).hexdigest()
        email_key = f"rl:subscribe:email:{email_hash}"
        email_count = redis_client.incr(email_key)
        if email_count == 1:
            redis_client.expire(email_key, _EMAIL_WINDOW)
        if email_count > _EMAIL_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
            )
    except HTTPException:
        raise
    except Exception:
        # Redis unavailable — fail open, don't block legitimate traffic
        pass


@router.post("/subscribe/{user_name}", status_code=status.HTTP_200_OK)
def subscribe_blog(user_name: str, request: Request, body: subscribers.Subscribe, db: Session = Depends(get_db)):

    # Extract real client IP (Cloudflare sets CF-Connecting-IP; fall back gracefully)
    ip = (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else None)
        or ""
    )

    # Normalize email before any DB work or rate-limit keying
    email = normalize_email(str(body.email))

    _check_subscribe_rate_limits(ip, email)

    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

    if not db_user:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"User with username {user_name} doesn't exist")

    if not is_pro_entitled(db_user, db) or not db_user.subscriber_collection_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscriptions are unavailable for this blog",
        )
     
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.email == email, models.Subscriber.user_id == db_user.user_id).first()

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
        return {"message": "Subscribed again"}
    
    new_subscriber = models.Subscriber(email=email, 
                                       user_id=db_user.user_id)

    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    token = create_sub_confirm_token(new_subscriber.subscriber_id, new_subscriber.user_id)
    send_sub_confirmation_email(new_subscriber.email, db_user.name, token)

    return {"message": "Please check your email to confirm subscription"}

@router.get("/confirm-subscription", status_code=status.HTTP_200_OK)
def confirm_subscription(token: str, db: Session = Depends(get_db)):

    try:
        payload = verify_sub_confirm_token(token)

    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired confirmation link")
    
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.subscriber_id == payload["subscriber_id"], models.Subscriber.user_id == payload["user_id"]).first()

    if not db_subscriber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")

    if db_subscriber.is_confirmed:
        return {"message": "Already confirmed"}
    
    db_subscriber.is_confirmed = True

    db.commit()
    db.refresh(db_subscriber)
    schedule_welcome_email_after_confirm(db, db_subscriber)

    return {"message": "Email verified successfully"}

@router.post("/unsubscribe/{user_name}", status_code=status.HTTP_200_OK)
def unsubscribe_blog(user_name: str, request: subscribers.Unsubscribe, db: Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with username: {user_name} doesn't exist"
        )

    db_subscriber = (db.query(models.Subscriber).filter(models.Subscriber.email == request.email, models.Subscriber.user_id == db_user.user_id).first())

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
    
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.subscriber_id == payload["subscriber_id"], models.Subscriber.user_id == payload["user_id"]).first()

    if not db_subscriber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcriber not found")
    
    if db_subscriber.unsubscribed_at:
        return {"message": "Already unsubscribed"}
    
    db_subscriber.unsubscribed_at = func.now()
    db.commit()

    return {"message": "Successfully unsubscribed"}