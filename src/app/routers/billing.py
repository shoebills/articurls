import json
import sys
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .. import models
from ..database import get_db
from ..utils import user_by_email
from ..utils.rate_limit import check_rate_limit_user
from ..security.oauth2 import get_current_user
from ..security.oauth2 import get_current_site
from ..schemas.billing import SubscriptionOut, TransactionOut, CheckoutResponse, CustomerPortalResponse, AccountUsage
from ..payments.client import client as dodo_client
from ..config import settings
from ..domains.utils import restore_domain_access, start_domain_grace_period
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


def _capture_dodo_customer_id(event_data, db_user):
    if not db_user or db_user.dodo_customer_id:
        return
    customer = getattr(event_data, "customer", None)
    if customer:
        cid = getattr(customer, "customer_id", None)
        if cid:
            db_user.dodo_customer_id = cid


def _metadata_get(metadata, key):
    if not metadata:
        return None
    if isinstance(metadata, dict):
        return metadata.get(key)
    return getattr(metadata, key, None)


def _resolve_user_from_metadata_or_customer(db: Session, metadata=None, customer=None):
    metadata_user_id = _metadata_get(metadata, "user_id")
    if metadata_user_id is not None:
        try:
            db_user = db.query(models.User).filter(models.User.user_id == int(metadata_user_id)).first()
            if db_user:
                return db_user
        except (TypeError, ValueError):
            pass

    customer_email = getattr(customer, "email", None) if customer else None
    if customer_email:
        return user_by_email(db, customer_email)

    return None


def _get_user_subscription(db: Session, user_id: int | None):
    if user_id is None:
        return None
    return db.query(models.Subscriptions).filter(models.Subscriptions.user_id == user_id).first()


def _get_transaction_by_payment_id(db: Session, payment_id: str | None):
    if not payment_id:
        return None
    return db.query(models.Transactions).filter(models.Transactions.dodo_payment_id == payment_id).first()


def _retrieve_payment(payment_id: str | None):
    if not payment_id:
        return None
    try:
        return dodo_client.payments.retrieve(payment_id)
    except Exception as retrieve_err:
        print(f"[billing] payments.retrieve failed for {payment_id}: {retrieve_err}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return None


def _is_lifetime_product_cart(product_cart) -> bool:
    if not product_cart:
        return False

    for item in product_cart:
        pid = item.get("product_id") if isinstance(item, dict) else getattr(item, "product_id", None)
        if pid == settings.dodopayments_lifetime_product_id:
            return True

    return False


def _resolve_payment_context(db: Session, payment_id: str | None, event_data=None):
    transaction = _get_transaction_by_payment_id(db, payment_id)

    db_user = None
    if transaction:
        db_user = db.query(models.User).filter(models.User.user_id == transaction.user_id).first()

    if not db_user and event_data is not None:
        db_user = _resolve_user_from_metadata_or_customer(
            db,
            metadata=getattr(event_data, "metadata", None),
            customer=getattr(event_data, "customer", None),
        )

    db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None
    return transaction, db_user, db_sub


def _apply_transaction_status(transaction, status_value: str) -> None:
    if transaction:
        transaction.status = status_value


def _revoke_current_lifetime_access(db_user, db_sub) -> bool:
    if not db_user or not db_sub:
        return False
    if db_sub.plan_type != "lifetime" or db_sub.status not in {"active", "past_due"}:
        return False

    start_domain_grace_period(db_user)
    db_sub.plan_type = "lapsed"
    db_sub.status = "inactive"
    db_sub.dodo_subscription_id = None
    db_sub.current_period_start = None
    db_sub.current_period_end = None
    return True


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    plan: str = Body("monthly", embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):

    check_rate_limit_user("checkout", current_user.user_id, 5, 60)

    existing_lifetime = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == current_user.user_id,
        models.Subscriptions.plan_type == "lifetime",
        models.Subscriptions.status.in_(["active", "past_due"]),
    ).first()
    if existing_lifetime:
        raise HTTPException(status_code=409, detail="You already have lifetime access")

    product_ids = {
        "monthly": settings.dodopayments_product_id,
        "lifetime": settings.dodopayments_lifetime_product_id,
    }
    product_id = product_ids.get(plan)
    if not product_id:
        raise HTTPException(status_code=400, detail="Invalid plan")

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
                    _capture_dodo_customer_id(event.data, db_user)

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
                                db_sub.current_period_start = _to_aware_dt(incoming_start)
                                db_sub.current_period_end = _to_aware_dt(incoming_end)

                        else:
                            new_sub = models.Subscriptions(
                                user_id=db_user.user_id,
                                dodo_subscription_id=event.data.subscription_id,
                                plan_type="pro",
                                status="active",
                                current_period_start=_to_aware_dt(getattr(event.data, "previous_billing_date", None)),
                                current_period_end=_to_aware_dt(getattr(event.data, "next_billing_date", None)),
                            )

                            db.add(new_sub)
                            db_sub = new_sub

                        # Restore domain from grace/expired back to active on renewal
                        restore_domain_access(db_user)

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
                    _capture_dodo_customer_id(event.data, db_user)

                    db_sub = (
                        db.query(models.Subscriptions)
                        .filter(models.Subscriptions.user_id == db_user.user_id)
                        .first()
                    )
                    if db_sub and db_sub.plan_type != "lifetime":
                        db_sub.status = "cancelled"

        elif event_type == "subscription.on_hold":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)

                if db_user:
                    _capture_dodo_customer_id(event.data, db_user)

                    incoming_dodo_sid = getattr(event.data, "subscription_id", None)
                    db_sub = _get_user_subscription(db, db_user.user_id)

                    if db_sub and db_sub.plan_type == "lifetime":
                        if incoming_dodo_sid:
                            try:
                                dodo_client.subscriptions.update(incoming_dodo_sid, {"status": "cancelled"})
                            except Exception:
                                pass
                    elif db_sub:
                        db_sub.status = "past_due"
                        if incoming_dodo_sid and (
                            not db_sub.dodo_subscription_id or db_sub.dodo_subscription_id == incoming_dodo_sid
                        ):
                            db_sub.dodo_subscription_id = incoming_dodo_sid

        elif event_type == "subscription.renewed":
            customer = getattr(event.data, "customer", None)
            customer_email = getattr(customer, "email", None) if customer else None

            if customer_email:
                db_user = user_by_email(db, customer_email)

                if db_user:
                    _capture_dodo_customer_id(event.data, db_user)

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
                                db_sub.current_period_start = _to_aware_dt(incoming_start)
                                db_sub.current_period_end = _to_aware_dt(incoming_end)

                        else:
                            db_sub = models.Subscriptions(
                                user_id=db_user.user_id,
                                dodo_subscription_id=incoming_dodo_sid,
                                plan_type="pro",
                                status="active",
                                current_period_start=_to_aware_dt(getattr(event.data, "previous_billing_date", None)),
                                current_period_end=_to_aware_dt(getattr(event.data, "next_billing_date", None)),
                            )

                            db.add(db_sub)

                        # Restore domain from grace/expired back to active on renewal
                        restore_domain_access(db_user)

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
            db_user = _resolve_user_from_metadata_or_customer(
                db,
                metadata=event_metadata,
                customer=getattr(event.data, "customer", None),
            )

            if db_user:
                _capture_dodo_customer_id(event.data, db_user)

                dodo_sid = getattr(event.data, "subscription_id", None)

                db_sub = None
                if dodo_sid:
                    db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == dodo_sid).first())

                # minimal fallback for out-of-order webhooks
                if db_sub is None:
                    db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first())

                payment_id = getattr(event.data, "payment_id", None)

                if payment_id:
                    existing = db.query(models.Transactions).filter(
                        models.Transactions.dodo_payment_id == payment_id,
                    ).first()
                    if existing:
                        db_webhook.processed = True
                        db.commit()
                        return {"detail": "transaction already exists"}

                transaction = models.Transactions(
                        user_id=db_user.user_id,
                        subscription_id=db_sub.subscription_id if db_sub else None,
                        dodo_payment_id=payment_id,
                        amount=getattr(event.data, "total_amount", 0),
                        currency=getattr(event.data, "currency", "USD"),
                        status="succeeded",
                    )
                db.add(transaction)

                if payment_id:
                    product_cart = getattr(event.data, "product_cart", None)

                    if not product_cart:
                        payment = _retrieve_payment(payment_id)
                        product_cart = getattr(payment, "product_cart", None) if payment else None

                    is_lifetime = _is_lifetime_product_cart(product_cart)

                    checkout_plan = None
                    if event_metadata:
                        checkout_plan = _metadata_get(event_metadata, "plan_type")

                    if (checkout_plan == "lifetime" and not is_lifetime) or (checkout_plan != "lifetime" and is_lifetime):
                        print(f"[lifetime] WARNING: mismatch payment={payment_id} user={db_user.user_id} metadata.plan_type={checkout_plan} cart_lifetime={is_lifetime}", file=sys.stderr)

                    if is_lifetime:
                        if db_sub and db_sub.dodo_subscription_id:
                            try:
                                dodo_client.subscriptions.update(
                                    db_sub.dodo_subscription_id, {"status": "cancelled"}
                                )
                            except Exception:
                                pass

                        restore_domain_access(db_user)

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
                    _capture_dodo_customer_id(event.data, db_user)

                    db_sub = (
                        db.query(models.Subscriptions)
                        .filter(models.Subscriptions.user_id == db_user.user_id)
                        .first()
                    )
                    if db_sub and db_sub.plan_type != "lifetime":
                        db_sub.status = "past_due"

        elif event_type == "refund.succeeded":
            payment_id = getattr(event.data, "payment_id", None)
            refund_id = getattr(event.data, "refund_id", None)
            is_partial = bool(getattr(event.data, "is_partial", False))

            existing_tx, db_user, db_sub = _resolve_payment_context(db, payment_id, event.data)
            if db_user:
                _capture_dodo_customer_id(event.data, db_user)

            _apply_transaction_status(existing_tx, "partially_refunded" if is_partial else "refunded")

            payment = _retrieve_payment(payment_id)
            if not db_user and payment:
                db_user = _resolve_user_from_metadata_or_customer(
                    db,
                    metadata=getattr(payment, "metadata", None),
                    customer=getattr(payment, "customer", None),
                )
                db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None

            is_lifetime = _is_lifetime_product_cart(getattr(payment, "product_cart", None) if payment else None)
            if not is_partial and is_lifetime:
                if db_user and db_sub:
                    _revoke_current_lifetime_access(db_user, db_sub)
                else:
                    print(
                        f"[refund] lifetime refund could not be reconciled payment_id={payment_id} refund_id={refund_id}",
                        file=sys.stderr,
                    )
            elif not payment and payment_id:
                print(
                    f"[refund] unable to inspect payment_id={payment_id} for refund_id={refund_id}",
                    file=sys.stderr,
                )

        elif event_type == "refund.failed":
            payment_id = getattr(event.data, "payment_id", None)
            refund_id = getattr(event.data, "refund_id", None)
            existing_tx, db_user, _db_sub = _resolve_payment_context(db, payment_id, event.data)
            if db_user:
                _capture_dodo_customer_id(event.data, db_user)

            if existing_tx:
                existing_tx.status = "refund_failed"
            else:
                print(
                    f"[refund] refund.failed without local transaction payment_id={payment_id} refund_id={refund_id}",
                    file=sys.stderr,
                )

        elif event_type in {
            "dispute.opened",
            "dispute.challenged",
            "dispute.accepted",
            "dispute.cancelled",
            "dispute.expired",
            "dispute.won",
            "dispute.lost",
        }:
            payment_id = getattr(event.data, "payment_id", None)
            dispute_id = getattr(event.data, "dispute_id", None)
            status_map = {
                "dispute.opened": "disputed",
                "dispute.challenged": "dispute_challenged",
                "dispute.accepted": "dispute_accepted",
                "dispute.cancelled": "dispute_cancelled",
                "dispute.expired": "dispute_expired",
                "dispute.won": "won_dispute",
                "dispute.lost": "lost_dispute",
            }

            existing_tx, db_user, db_sub = _resolve_payment_context(db, payment_id)
            if existing_tx:
                existing_tx.status = status_map[event_type]
            else:
                print(
                    f"[dispute] {event_type} without local transaction payment_id={payment_id} dispute_id={dispute_id}",
                    file=sys.stderr,
                )

            is_adverse_dispute = event_type in {"dispute.accepted", "dispute.expired", "dispute.lost"}
            if is_adverse_dispute and payment_id:
                payment = _retrieve_payment(payment_id)
                if not db_user and payment:
                    db_user = _resolve_user_from_metadata_or_customer(
                        db,
                        metadata=getattr(payment, "metadata", None),
                        customer=getattr(payment, "customer", None),
                    )
                    db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None

                is_lifetime = _is_lifetime_product_cart(getattr(payment, "product_cart", None) if payment else None)
                if is_lifetime:
                    if db_user and db_sub:
                        _revoke_current_lifetime_access(db_user, db_sub)
                    else:
                        print(
                            f"[dispute] lifetime dispute could not be reconciled payment_id={payment_id} dispute_id={dispute_id}",
                            file=sys.stderr,
                        )
                elif not payment:
                    print(
                        f"[dispute] unable to inspect payment_id={payment_id} for {event_type} dispute_id={dispute_id}",
                        file=sys.stderr,
                    )

        else:
            print(f"[webhook] unhandled event type: {event_type} id={event_id}", file=sys.stderr)

        db_webhook.processed = True
        db.commit()
        return {"detail": "processed"}
        
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="temporary failure")

@router.get("/subscription", response_model=SubscriptionOut)
def get_my_subscription(db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()

    if not db_sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    return db_sub

@router.get("/transactions", response_model=List[TransactionOut])
def get_my_transactions(db: Session = Depends(get_db), current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site)):

    transactions = db.query(models.Transactions).filter(models.Transactions.user_id == current_user.user_id).order_by(models.Transactions.created_at.desc()).all()

    return transactions


@router.get("/customer-portal", response_model=CustomerPortalResponse)
def get_customer_portal(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user), current_site: models.Site = Depends(get_current_site),
):
    if not current_user.dodo_customer_id:
        raise HTTPException(status_code=404, detail="Customer record not found")

    try:
        session = dodo_client.customers.customer_portal.create(
            customer_id=current_user.dodo_customer_id,
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to create customer portal session")

    return {"url": session.link}


@router.get("/usage", response_model=AccountUsage)
def get_account_usage(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from ..umami.client import UmamiClient
    from ..umami.service import get_umami_period_timestamps
    from sqlalchemy import func
    
    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()
    plan_type = db_sub.plan_type if db_sub else "trial"

    TIERS = {
        "trial": {"limit": 10000, "price": 9},
        "pro": {"limit": 10000, "price": 9},
        "pro_10k": {"limit": 10000, "price": 9},
        "pro_50k": {"limit": 50000, "price": 29},
        "pro_100k": {"limit": 100000, "price": 49},
        "pro_250k": {"limit": 250000, "price": 79},
        "pro_500k": {"limit": 500000, "price": 99},
        "pro_1m": {"limit": 1000000, "price": 149},
        "lifetime": {"limit": 100000, "price": 199},
    }
    tier_info = TIERS.get(plan_type, {"limit": 10000, "price": 9})

    umami_client = UmamiClient()

    sites = db.query(models.Site).filter(models.Site.user_id == current_user.user_id).all()
    site_items = []
    total_views = 0

    for site in sites:
        views = 0
        if site.umami_website_id and umami_client.configured:
            try:
                start_at, end_at = get_umami_period_timestamps("30d")
                stats = umami_client.get_website_stats_sync(site.umami_website_id, start_at=start_at, end_at=end_at)
                views = stats.get("pageviews", 0)
            except Exception:
                views = 0
        
        if views == 0:
            views = (
                db.query(func.count(models.Views.view_id))
                .filter(models.Views.site_id == site.site_id)
                .scalar()
            ) or 0

        total_views += views
        site_items.append({
            "site_id": site.site_id,
            "subdomain": site.subdomain,
            "nav_blog_name": site.nav_blog_name or site.subdomain,
            "pageviews": views,
        })

    usage_pct = min(100.0, round((total_views / tier_info["limit"] * 100), 1)) if tier_info["limit"] > 0 else 0.0

    return {
        "total_pageviews": total_views,
        "tier_limit": tier_info["limit"],
        "plan_type": plan_type,
        "tier_price_usd": tier_info["price"],
        "usage_percentage": usage_pct,
        "sites": site_items,
    }
