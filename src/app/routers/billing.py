import json
from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .. import models
from ..database import get_db
from ..utils import user_by_email
from ..security.oauth2 import get_current_user
from ..schemas.billing import SubscriptionOut, TransactionOut, CheckoutResponse
from ..payments.client import client as dodo_client
from ..config import settings
from typing import List


router = APIRouter(
    prefix="/billing", 
    tags=["Billing"]
    )


def _to_aware_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        try:
            parsed = datetime.fromisoformat(text)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _should_apply_period_update(db_sub, incoming_sid, incoming_start, incoming_end):
    """Prevent stale/parallel webhook events from shrinking active periods."""
    incoming_end_dt = _to_aware_dt(incoming_end)
    current_end_dt = _to_aware_dt(getattr(db_sub, "current_period_end", None)) if db_sub else None
    current_sid = getattr(db_sub, "dodo_subscription_id", None) if db_sub else None
    current_status = getattr(db_sub, "status", None) if db_sub else None

    if db_sub is None:
        return True

    # Parallel subscription id while current plan is still active: ignore unless clearly newer.
    if current_sid and incoming_sid and current_sid != incoming_sid:
        if current_status in {"active", "past_due"}:
            if current_end_dt is not None and incoming_end_dt is not None and incoming_end_dt > current_end_dt:
                return True
            return False
        return True

    # Same subscription stream (or sid missing): only move period forward.
    if current_end_dt is not None and incoming_end_dt is not None and incoming_end_dt <= current_end_dt:
        return False

    return True


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    plan: str = Body("monthly", embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):

    existing_lifetime = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == current_user.user_id,
        models.Subscriptions.plan_type == "lifetime",
        models.Subscriptions.status.in_(["active", "past_due"]),
    ).first()
    if existing_lifetime:
        raise HTTPException(status_code=409, detail="You already have lifetime access")

    product_id = (
        settings.dodopayments_lifetime_product_id if plan == "lifetime"
        else settings.dodopayments_product_id
    )

    session = dodo_client.checkout_sessions.create(

        product_cart=[
            {
            "product_id": product_id,
            "quantity": 1
            }
        ],

        customer={
            "email": current_user.email,
            "name": current_user.name
            },

        return_url=f"{settings.app_base_url.rstrip('/')}/dashboard/billing/success",

        metadata={"plan_type": plan, "user_id": str(current_user.user_id)},
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
    except Exception as e:
        import sys, traceback
        print(f"[webhook] unwrap failed: {e}", file=sys.stderr)
        print(f"[webhook] headers: webhook-id={request.headers.get('webhook-id','?')[:20]}... sig={request.headers.get('webhook-signature','?')[:20]}... ts={request.headers.get('webhook-timestamp','?')}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event_id = request.headers.get("webhook-id", "")
    event_type = event.type

    if not event_id:
        raise HTTPException(status_code=400, detail="Missing webhook-id")

    db_webhook = db.query(models.PaymentWebhooks).filter(models.PaymentWebhooks.dodo_event_id == event_id).first()

    if db_webhook and db_webhook.processed:
        return {"detail": "already processed"}

    if not db_webhook:
        try:
            try:
                payload_json = json.loads(raw_body.decode("utf-8", errors="replace"))
            except json.JSONDecodeError:
                payload_json = {"raw": raw_body.decode("utf-8", errors="replace")}
            db_webhook = models.PaymentWebhooks(
                event_type=event_type,
                dodo_event_id=event_id,
                payload=payload_json,
                processed=False,
            )
            db.add(db_webhook)
            db.commit()
            db.refresh(db_webhook)

        except IntegrityError:
            db.rollback()
            db_webhook = db.query(models.PaymentWebhooks).filter(models.PaymentWebhooks.dodo_event_id == event_id).first()
            if db_webhook and db_webhook.processed:
                return {"detail": "already processed"}

    try:
        if event_type == "subscription.active":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)

                if db_user:
                    incoming_dodo_sid = getattr(event.data, "subscription_id", None)

                    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first()

                    if db_sub and db_sub.plan_type == "lifetime":
                        if incoming_dodo_sid:
                            try:
                                dodo_client.subscriptions.update(incoming_dodo_sid, {"status": "cancelled"})
                            except Exception:
                                pass
                    else:
                        incoming_start = getattr(event.data, "previous_billing_date", None)
                        incoming_end = getattr(event.data, "next_billing_date", None)
                        apply_period_update = _should_apply_period_update(
                            db_sub, incoming_dodo_sid, incoming_start, incoming_end
                        )

                        if db_sub:
                            if apply_period_update:
                                db_sub.dodo_subscription_id = incoming_dodo_sid
                                db_sub.plan_type = "pro"
                                db_sub.status = "active"
                                db_sub.current_period_start = incoming_start
                                db_sub.current_period_end = incoming_end

                        else:
                            new_sub = models.Subscriptions(
                                user_id=db_user.user_id,
                                dodo_subscription_id=event.data.subscription_id,
                                plan_type="pro",
                                status="active",
                                current_period_start=getattr(event.data, "previous_billing_date", None),
                                current_period_end=getattr(event.data, "next_billing_date", None),
                            )

                            db.add(new_sub)
                            db_sub = new_sub

                        # Restore domain from grace/expired back to active on renewal
                        if db_user.domain_status in (models.DomainStatus.GRACE, models.DomainStatus.EXPIRED):
                            if db_user.custom_domain and db_user.is_domain_verified:
                                db_user.domain_status = models.DomainStatus.ACTIVE
                                db_user.grace_started_at = None
                                db_user.grace_expires_at = None
                                try:
                                    from ..redis_client import redis_client
                                    redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
                                except Exception:
                                    pass

                        if db_sub and incoming_dodo_sid:
                            db.query(models.Transactions).filter(
                                models.Transactions.user_id == db_user.user_id,
                                models.Transactions.subscription_id.is_(None),
                            ).update(
                                {"subscription_id": db_sub.subscription_id},
                                synchronize_session=False,
                            )

        elif event_type == "subscription.cancelled":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)
                if db_user:
                    db_sub = (
                        db.query(models.Subscriptions)
                        .filter(models.Subscriptions.user_id == db_user.user_id)
                        .first()
                    )
                    if db_sub and db_sub.plan_type != "lifetime":
                        db_sub.status = "cancelled"

        elif event_type == "subscription.renewed":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)

                if db_user:
                    incoming_dodo_sid = getattr(event.data, "subscription_id", None)

                    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first()

                    if db_sub and db_sub.plan_type == "lifetime":
                        if incoming_dodo_sid:
                            try:
                                dodo_client.subscriptions.update(incoming_dodo_sid, {"status": "cancelled"})
                            except Exception:
                                pass
                    else:
                        incoming_start = getattr(event.data, "previous_billing_date", None)
                        incoming_end = getattr(event.data, "next_billing_date", None)
                        apply_period_update = _should_apply_period_update(
                            db_sub, incoming_dodo_sid, incoming_start, incoming_end
                        )

                        if db_sub:
                            if apply_period_update:
                                db_sub.dodo_subscription_id = incoming_dodo_sid
                                db_sub.plan_type = "pro"
                                db_sub.status = "active"
                                db_sub.current_period_start = incoming_start
                                db_sub.current_period_end = incoming_end

                        else:
                            db_sub = models.Subscriptions(
                                user_id=db_user.user_id,
                                dodo_subscription_id=incoming_dodo_sid,
                                plan_type="pro",
                                status="active",
                                current_period_start=getattr(event.data, "previous_billing_date", None),
                                current_period_end=getattr(event.data, "next_billing_date", None),
                            )

                            db.add(db_sub)

                        # Restore domain from grace/expired back to active on renewal
                        if db_user.domain_status in (models.DomainStatus.GRACE, models.DomainStatus.EXPIRED):
                            if db_user.custom_domain and db_user.is_domain_verified:
                                db_user.domain_status = models.DomainStatus.ACTIVE
                                db_user.grace_started_at = None
                                db_user.grace_expires_at = None
                                try:
                                    from ..redis_client import redis_client
                                    redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
                                except Exception:
                                    pass

                        if db_sub and incoming_dodo_sid:
                            db.query(models.Transactions).filter(
                                models.Transactions.user_id == db_user.user_id,
                                models.Transactions.subscription_id.is_(None),
                            ).update(
                                {"subscription_id": db_sub.subscription_id},
                                synchronize_session=False,
                            )

        elif event_type == "payment.succeeded":
            event_metadata = getattr(event.data, "metadata", None) or {}
            db_user = None

            metadata_user_id = None
            if isinstance(event_metadata, dict):
                metadata_user_id = event_metadata.get("user_id")
            else:
                metadata_user_id = getattr(event_metadata, "user_id", None)

            if metadata_user_id:
                try:
                    db_user = db.query(models.User).filter(models.User.user_id == int(metadata_user_id)).first()
                except (ValueError, TypeError):
                    pass

            if not db_user:
                customer = getattr(event.data, "customer", None)
                customer_email = getattr(customer, "email", None) if customer else None
                db_user = user_by_email(db, customer_email) if customer_email else None

            if db_user:
                dodo_sid = getattr(event.data, "subscription_id", None)

                db_sub = None
                if dodo_sid:
                    db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == dodo_sid).first())

                # minimal fallback for out-of-order webhooks
                if db_sub is None:
                    db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first())

                transaction = models.Transactions(
                        user_id=db_user.user_id,
                        subscription_id=db_sub.subscription_id if db_sub else None,
                        dodo_payment_id=getattr(event.data, "payment_id", None),
                        amount=getattr(event.data, "total_amount", 0),
                        currency=getattr(event.data, "currency", "USD"),
                        status="succeeded",
                    )
                db.add(transaction)

                payment_id = getattr(event.data, "payment_id", None)
                if payment_id:
                    product_cart = getattr(event.data, "product_cart", None)

                    if not product_cart:
                        try:
                            payment = dodo_client.payments.retrieve(payment_id)
                            product_cart = getattr(payment, "product_cart", None)
                        except Exception as retrieve_err:
                            import traceback, sys
                            print(f"[lifetime] payments.retrieve failed: {retrieve_err}", file=sys.stderr)
                            traceback.print_exc()
                            product_cart = None

                    is_lifetime = False
                    if product_cart:
                        for item in product_cart:
                            pid = item.get("product_id") if isinstance(item, dict) else getattr(item, "product_id", None)
                            if pid == settings.dodopayments_lifetime_product_id:
                                is_lifetime = True
                                break

                    checkout_plan = None
                    if event_metadata:
                        checkout_plan = event_metadata.get("plan_type") if isinstance(event_metadata, dict) else getattr(event_metadata, "plan_type", None)

                    if (checkout_plan == "lifetime" and not is_lifetime) or (checkout_plan != "lifetime" and is_lifetime):
                        import sys as _sys
                        print(f"[lifetime] WARNING: mismatch payment={payment_id} user={db_user.user_id} metadata.plan_type={checkout_plan} cart_lifetime={is_lifetime}", file=_sys.stderr)

                    if is_lifetime:
                        if db_sub and db_sub.dodo_subscription_id:
                            try:
                                dodo_client.subscriptions.update(
                                    db_sub.dodo_subscription_id, {"status": "cancelled"}
                                )
                            except Exception:
                                pass

                        if db_user.domain_status in (models.DomainStatus.GRACE, models.DomainStatus.EXPIRED):
                            if db_user.custom_domain and db_user.is_domain_verified:
                                db_user.domain_status = models.DomainStatus.ACTIVE
                                db_user.grace_started_at = None
                                db_user.grace_expires_at = None
                                try:
                                    from ..redis_client import redis_client
                                    redis_client.delete(f"domain_lookup:{db_user.custom_domain}")
                                except Exception:
                                    pass

                        now = datetime.now(timezone.utc)
                        if db_sub:
                            db_sub.plan_type = "lifetime"
                            db_sub.status = "active"
                            db_sub.dodo_subscription_id = None
                            db_sub.current_period_start = now
                            db_sub.current_period_end = None
                        else:
                            db_sub = models.Subscriptions(
                                user_id=db_user.user_id,
                                plan_type="lifetime",
                                status="active",
                                current_period_start=now,
                                current_period_end=None,
                            )
                            db.add(db_sub)

        elif event_type == "payment.failed":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)

                if db_user:
                    db_sub = (
                        db.query(models.Subscriptions)
                        .filter(models.Subscriptions.user_id == db_user.user_id)
                        .first()
                    )
                    if db_sub and db_sub.plan_type != "lifetime":
                        db_sub.status = "past_due"

        db_webhook.processed = True
        db.commit()
        return {"detail": "processed"}
        
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="temporary failure")

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