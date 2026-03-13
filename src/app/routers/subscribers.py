from fastapi import Depends, APIRouter, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..schemas import subscribers
from ..security.oauth2 import verify_unsubscribe_token, create_sub_confirm_token, verify_sub_confirm_token
from ..email.service import send_confirmation_email


router = APIRouter(
    tags=["Subscriber"]
    )


@router.post("/subscribe/{username}", status_code=status.HTTP_200_OK)
def subscribe_blog(username: str, request: subscribers.Subscribe, db: Session = Depends(get_db)):
     
    user_db = db.query(models.User).filter(models.User.user_name == username).first()

    if not user_db:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"User with username {username} doesn't exist")
     
    subscriber_db = db.query(models.Subscriber).filter(models.Subscriber.email == request.email, models.Subscriber.user_id == user_db.user_id).first()

    # already active subscriber
    if subscriber_db and subscriber_db.unsubscribed_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already subscribed to this user"
        )

    # resubscribe
    if subscriber_db and subscriber_db.unsubscribed_at:
        subscriber_db.unsubscribed_at = None
        db.commit()
        return {"message": "Subscribed again"}
    
    new_subscriber = models.Subscriber(email=request.email, 
                                       user_id=user_db.user_id)

    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    token = create_sub_confirm_token(new_subscriber.subscriber_id, new_subscriber.user_id)
    send_confirmation_email(new_subscriber.email, user_db.name, token)

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

    return {"message": "Email verified successfully"}

@router.post("/unsubscribe/{username}", status_code=status.HTTP_200_OK)
def unsubscribe_blog(username: str, request: subscribers.Unsubscribe, db: Session = Depends(get_db)):

    user_db = db.query(models.User).filter(models.User.user_name == username).first()

    if not user_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with username {username} doesn't exist"
        )

    subscriber_db = (db.query(models.Subscriber).filter(models.Subscriber.email == request.email, models.Subscriber.user_id == user_db.user_id).first())

    if not subscriber_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscriber not found"
        )

    if subscriber_db.unsubscribed_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already unsubscribed"
        )

    subscriber_db.unsubscribed_at = func.now()

    db.commit()

    return {"message": "Successfully unsubscribed"}

@router.get("/unsubscribe", status_code=status.HTTP_200_OK)
def unsubscribe_via_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = verify_unsubscribe_token(token)

    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired unsubscriber link")
    
    subscriber = db.query(models.Subscriber).filter(models.Subscriber.subscriber_id == payload["subscriber_id"], models.Subscriber.user_id == payload["user_id"]).first()

    if not subscriber:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcriber not found")
    
    if subscriber.unsubscribed_at:
        return {"message": "Already unsubscribed"}
    
    subscriber.unsubscribed_at = func.now()
    db.commit()

    return {"message": "Successfully unsubscribed"}