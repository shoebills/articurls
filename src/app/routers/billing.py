from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..security.oauth2 import get_current_user
from ..schemas.billing import SubscriptionOut, TransactionOut, CheckoutResponse
from ..payments.client import client as dodo_client
from ..config import settings
from typing import List


router = APIRouter(
    prefix="/billing", 
    tags=["Billing"]
    )


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    session = dodo_client.checkout_sessions.create(

        product_cart=[
            {
            "product_id": settings.dodopayments_product_id, 
            "quantity": 1
            }
        ],

        customer={
            "email": current_user.email, 
            "name": current_user.name
            },

        return_url="https://articurls.com/billing/success",
    )

    return {"checkout_url": session.checkout_url}


@router.post("/webhooks/dodo")
async def handle_webhook(request: Request, db: Session = Depends(get_db)):

    raw_body = await request.body()

    try:
        event = dodo_client.webhooks.unwrap(
            raw_body,
            headers={
                "webhook-id": request.headers.get("webhook-id", ""),
                "webhook-signature": request.headers.get("webhook-signature", ""),
                "webhook-timestamp": request.headers.get("webhook-timestamp", ""),
            },
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_id = request.headers.get("webhook-id", "")
    event_type = event.type

    db_webhook = db.query(models.PaymentWebhooks).filter(models.PaymentWebhooks.dodo_event_id == event_id).first()

    if db_webhook:
        return {"detail": "already processed"}

    new_webhook = models.PaymentWebhooks(
        event_type=event_type,
        dodo_event_id=event_id,
        payload=raw_body.decode("utf-8", errors="replace"),
        processed=False,
    )
    db.add(new_webhook)
    db.flush()

    if event_type == "subscription.active":
        db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == event.data.subscription_id).first()

        if db_sub:
            db_sub.status = "active"
            db_sub.current_period_start = getattr(event.data, "previous_billing_date", None)
            db_sub.current_period_end = getattr(event.data, "next_billing_date", None)
            
        else:
            db_user = db.query(models.User).filter(models.User.email == event.data.customer.email).first()

            if db_user:
                new_sub = models.Subscriptions(
                    user_id=db_user.user_id,
                    dodo_subscription_id=event.data.subscription_id,
                    plan_type="pro",
                    status="active",
                    current_period_start=getattr(event.data, "previous_billing_date", None),
                    current_period_end=getattr(event.data, "next_billing_date", None),
                )

                db.add(new_sub)

    elif event_type == "subscription.cancelled":
        db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == event.data.subscription_id).first()

        if db_sub:
            db_sub.status = "cancelled"

    elif event_type == "subscription.renewed":
        db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == event.data.subscription_id).first()

        if db_sub:
            db_sub.status = "active"
            db_sub.current_period_start = getattr(event.data, "previous_billing_date", None)
            db_sub.current_period_end = getattr(event.data, "next_billing_date", None)

    elif event_type == "payment.succeeded":

        customer = getattr(event.data, "customer", None)
        customer_email = getattr(customer, "email", None) if customer else None
        db_user = db.query(models.User).filter(models.User.email == customer_email).first() if customer_email else None

        if db_user:
            db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == getattr(event.data, "subscription_id", None)).first()

            transaction = models.Transactions(
                user_id=db_user.user_id,
                subscription_id=db_sub.subscription_id if db_sub else None,
                dodo_payment_id=getattr(event.data, "payment_id", None),
                amount=getattr(event.data, "total_amount", 0),
                currency=getattr(event.data, "currency", "USD"),
                status="succeeded",
            )

            db.add(transaction)

    elif event_type == "payment.failed":
        db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == getattr(event.data, "subscription_id", None)).first()

        if db_sub:
            db_sub.status = "past_due"

    new_webhook.processed = True
    db.commit()

    return {"detail": "processed"}


@router.get("/subscription", response_model=SubscriptionOut)
def get_my_subscription(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()

    if not db_sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    return db_sub


@router.get("/transactions", response_model=List[TransactionOut])
def get_my_transactions(db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    transactions = db.query(models.Transactions).filter(models.Transactions.user_id == current_user.user_id).order_by(models.Transactions.created_at.desc()).all()

    return transactions