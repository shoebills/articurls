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


@router.post("/subscribe/{user_name}", status_code=status.HTTP_200_OK)
def subscribe_blog(user_name: str, request: subscribers.Subscribe, db: Session = Depends(get_db)):
     
    db_user = db.query(models.User).filter(models.User.user_name == user_name).first()

    if not db_user:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"User with username {user_name} doesn't exist")
     
    db_subscriber = db.query(models.Subscriber).filter(models.Subscriber.email == request.email, models.Subscriber.user_id == db_user.user_id).first()

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
    
    new_subscriber = models.Subscriber(email=request.email, 
                                       user_id=db_user.user_id)

    db.add(new_subscriber)
    db.commit()
    db.refresh(new_subscriber)

    token = create_sub_confirm_token(new_subscriber.subscriber_id, new_subscriber.user_id)
    send_confirmation_email(new_subscriber.email, db_user.name, token)

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