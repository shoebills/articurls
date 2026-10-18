import json
import sys
import traceback
import uuid
from itertools import islice
from typing import List, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .. import models
from ..database import get_db
from ..utils import user_by_email
from ..utils.rate_limit import check_rate_limit_user
from ..security.oauth2 import get_current_user
from ..schemas.billing import (
    SubscriptionOut,
    TransactionOut,
    CheckoutResponse,
    CheckoutRequest,
    ChangePlanRequest,
    ChangePlanResponse,
    CustomerPortalResponse,
    AccountUsage,
)
from ..payments.client import client as dodo_client
from ..payments.catalog import TIERS, product_id_for, resolve_product
from ..config import settings
from ..domains.utils import restore_domain_access, start_domain_grace_period
from ..email.service import send_payment_failed_email, send_subscription_cancelled_email


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


def _prop_get(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _cancel_dodo_subscription(sid: str | None) -> None:
    if not sid:
        return
    try:
        dodo_client.subscriptions.update(sid, status="cancelled")
        print(f"[billing] successfully cancelled Dodo subscription sid={sid}", file=sys.stderr)
    except Exception as e:
        print(f"[billing] error cancelling Dodo subscription sid={sid}: {e}", file=sys.stderr)


def _capture_dodo_customer_id(event_data, db_user):
    if not db_user or db_user.dodo_customer_id:
        return
    customer = _prop_get(event_data, "customer")
    if customer:
        cid = _prop_get(customer, "customer_id")
        if cid:
            db_user.dodo_customer_id = cid


def _metadata_get(metadata, key):
    return _prop_get(metadata, key)


def _resolve_tier_and_cycle(event_data):
    product_id = _prop_get(event_data, "product_id")
    tier, cycle = resolve_product(product_id)
    if tier:
        return tier, cycle

    # Fallback for subscriptions created before tier/cycle came from product_id.
    metadata_tier = _metadata_get(_prop_get(event_data, "metadata"), "tier")
    if metadata_tier in TIERS:
        return metadata_tier, None
    return None, None


def _is_in_dodo_trial(sid: str | None) -> bool:
    """True while a subscription has never been charged real money yet.

    Covers both card-present (one $0 trial payment) and card-less (no payments)
    free trials: in trial iff no payment has a non-zero total_amount.
    """
    if not sid:
        return False
    try:
        items = list(islice(dodo_client.payments.list(subscription_id=sid, page_size=2), 2))
    except Exception:
        return False
    return all(_prop_get(p, "total_amount", 0) == 0 for p in items)


def _subscription_has_charge(db: Session, subscription_id) -> bool:
    return (
        db.query(models.Transactions)
        .filter(
            models.Transactions.subscription_id == subscription_id,
            models.Transactions.amount > 0,
            models.Transactions.status == "succeeded",
        )
        .first()
        is not None
    )


def _lapse_subscription_with_grace(db_user, db_sub) -> None:
    if not db_sub:
        return
    db_sub.status = "lapsed"
    if db_user:
        for db_site in db_user.sites:
            start_domain_grace_period(db_site)


def _resolve_user_from_metadata_or_customer(db: Session, metadata=None, customer=None, subscription_id=None):
    metadata_user_id = _metadata_get(metadata, "user_id")
    if metadata_user_id is not None:
        try:
            uid = uuid.UUID(str(metadata_user_id))
            db_user = db.query(models.User).filter(models.User.user_id == uid).first()
            if db_user:
                return db_user
        except (TypeError, ValueError):
            pass

    if subscription_id:
        db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == subscription_id).first()
        if db_sub:
            db_user = db.query(models.User).filter(models.User.user_id == db_sub.user_id).first()
            if db_user:
                return db_user

    cid = _prop_get(customer, "customer_id")
    if cid:
        db_user = db.query(models.User).filter(models.User.dodo_customer_id == cid).first()
        if db_user:
            return db_user

    customer_email = _prop_get(customer, "email")
    if customer_email:
        return user_by_email(db, customer_email)

    return None


def _get_user_subscription(db: Session, user_id: Any | None):
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
        pid = _prop_get(item, "product_id")
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
            metadata=_prop_get(event_data, "metadata"),
            customer=_prop_get(event_data, "customer"),
            subscription_id=_prop_get(event_data, "subscription_id"),
        )

    db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None
    return transaction, db_user, db_sub


def _apply_transaction_status(transaction, status_value: str) -> None:
    if transaction:
        transaction.status = status_value


def _revoke_current_lifetime_access(db_user, db_sub) -> bool:
    if not db_user or not db_sub:
        return False
    if db_sub.plan_type != "lifetime" or db_sub.status != "active":
        return False

    for db_site in db_user.sites:
        start_domain_grace_period(db_site)
    db_sub.status = "lapsed"
    db_sub.dodo_subscription_id = None
    db_sub.current_period_start = None
    db_sub.current_period_end = None
    return True


def _restore_user_domain_access(db_user) -> None:
    for db_site in db_user.sites:
        restore_domain_access(db_site)


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    plan = body.plan
    tier = body.tier
    cycle = body.billing_cycle

    check_rate_limit_user("checkout", current_user.user_id, 5, 60)

    db_sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == current_user.user_id
    ).first()

    if db_sub and db_sub.plan_type == "lifetime" and db_sub.status == "active":
        raise HTTPException(status_code=409, detail="You already have lifetime access")

    if plan == "lifetime":
        product_id = settings.dodopayments_lifetime_product_id
        tier = None
        cycle = None
        if not product_id:
            raise HTTPException(status_code=503, detail="Lifetime plan is not configured")
    elif plan == "pro":
        if (
            db_sub
            and db_sub.plan_type == "pro"
            and db_sub.status in ("active", "past_due", "cancelled")
            and db_sub.dodo_subscription_id
        ):
            raise HTTPException(
                status_code=409,
                detail="You already have an active subscription. Switch tiers from Billing instead.",
            )
        tier = tier or "pro_10k"
        if tier not in TIERS:
            raise HTTPException(status_code=400, detail="Invalid tier")
        if cycle not in ("monthly", "yearly"):
            raise HTTPException(status_code=400, detail="Invalid billing cycle")
        product_id = product_id_for(tier, cycle)
        if not product_id:
            raise HTTPException(status_code=503, detail="This tier is not configured yet")
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")

    session = dodo_client.checkout_sessions.create(
        product_cart=[{"product_id": product_id, "quantity": 1}],
        customer=(
            {"customer_id": current_user.dodo_customer_id}
            if current_user.dodo_customer_id
            else {"email": current_user.email, "name": current_user.name}
        ),
        return_url=(
            f"{settings.app_base_url.rstrip('/')}/dashboard/billing/success"
            f"?target_plan={plan}&target_tier={tier or ''}&target_cycle={cycle or ''}"
        ),
        metadata={"user_id": str(current_user.user_id)},
    )

    return {"checkout_url": session.checkout_url}


@router.post("/change-plan", response_model=ChangePlanResponse)
def change_subscription_plan(
    body: ChangePlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tier = body.tier
    cycle = body.billing_cycle

    check_rate_limit_user("change-plan", current_user.user_id, 10, 60)

    if tier not in TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    if cycle not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    db_sub = db.query(models.Subscriptions).filter(
        models.Subscriptions.user_id == current_user.user_id
    ).first()

    if not db_sub or db_sub.plan_type != "pro" or not db_sub.dodo_subscription_id:
        raise HTTPException(status_code=409, detail="No active subscription to change. Start checkout instead.")
    if db_sub.status == "past_due":
        raise HTTPException(
            status_code=409,
            detail="Your subscription is past due. Update your payment method from the customer portal first.",
        )
    if db_sub.status != "active":
        raise HTTPException(status_code=409, detail="Your subscription is not active.")

    target_product_id = product_id_for(tier, cycle)
    if not target_product_id:
        raise HTTPException(status_code=503, detail="This tier is not configured yet")

    if db_sub.tier == tier and (db_sub.billing_cycle or "monthly") == cycle:
        return ChangePlanResponse(applied=False, scheduled=False)

    in_trial = _is_in_dodo_trial(db_sub.dodo_subscription_id)
    current_cycle = db_sub.billing_cycle or "monthly"

    if in_trial:
        mode = "do_not_bill"
        effective_at = "immediately"
        scheduled = False
        on_payment_failure = {}
    elif current_cycle == "yearly" and cycle == "monthly":
        mode = "full_immediately"
        effective_at = "next_billing_date"
        scheduled = True
        on_payment_failure = {}
    else:
        mode = "difference_immediately"
        effective_at = "immediately"
        scheduled = False
        on_payment_failure = {"on_payment_failure": "prevent_change"}

    try:
        dodo_client.subscriptions.change_plan(
            db_sub.dodo_subscription_id,
            product_id=target_product_id,
            proration_billing_mode=mode,
            quantity=1,
            effective_at=effective_at,
            **on_payment_failure,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Plan change failed: {e}")

    if scheduled:
        db_sub.pending_tier = tier
        db_sub.pending_billing_cycle = cycle
    else:
        db_sub.pending_tier = None
        db_sub.pending_billing_cycle = None

    db.commit()

    return ChangePlanResponse(
        applied=not scheduled,
        scheduled=scheduled,
        effective_date=db_sub.current_period_end if scheduled else None,
    )


def process_webhook_event(db: Session, event_type: str, event_data: Any, event_id: str | None = None) -> bool:
    if event_type in ("subscription.active", "subscription.plan_changed", "subscription.updated"):
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)
            effective_tier, effective_cycle = _resolve_tier_and_cycle(event_data)

            db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first()

            if db_sub and db_sub.plan_type == "lifetime":
                if incoming_dodo_sid:
                    _cancel_dodo_subscription(incoming_dodo_sid)
            else:
                incoming_start = _prop_get(event_data, "previous_billing_date")
                incoming_end = _prop_get(event_data, "next_billing_date")
                cancel_scheduled = bool(_prop_get(event_data, "cancel_at_next_billing_date", False))

                apply_period_update = _should_apply_period_update(
                    db_sub, incoming_dodo_sid, incoming_start, incoming_end
                )

                if db_sub:
                    if db_sub.status == "cancelled" and cancel_scheduled:
                        # Cancel-at-period-end already recorded locally; keep it.
                        pass
                    elif apply_period_update:
                        db_sub.dodo_subscription_id = incoming_dodo_sid
                        db_sub.plan_type = "pro"
                        db_sub.status = "active"
                        db_sub.current_period_start = _to_aware_dt(incoming_start)
                        db_sub.current_period_end = _to_aware_dt(incoming_end)
                        if effective_tier:
                            db_sub.tier = effective_tier
                            db_sub.billing_cycle = effective_cycle

                    if event_type == "subscription.plan_changed":
                        db_sub.pending_tier = None
                        db_sub.pending_billing_cycle = None
                else:
                    new_sub = models.Subscriptions(
                        user_id=db_user.user_id,
                        dodo_subscription_id=incoming_dodo_sid,
                        plan_type="pro",
                        status="active",
                        tier=effective_tier,
                        billing_cycle=effective_cycle,
                        current_period_start=_to_aware_dt(incoming_start),
                        current_period_end=_to_aware_dt(incoming_end),
                    )

                    db.add(new_sub)
                    db_sub = new_sub

                # Restore domain from grace/expired back to active on renewal
                _restore_user_domain_access(db_user)

                if db_sub and incoming_dodo_sid:
                    db.query(models.Transactions).filter(
                        models.Transactions.user_id == db_user.user_id,
                        models.Transactions.subscription_id.is_(None),
                    ).update(
                        {"subscription_id": db_sub.subscription_id},
                        synchronize_session=False,
                    )
        else:
            print(f"[subscription] {event_type} could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "subscription.cancelled":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

            db_sub = (
                db.query(models.Subscriptions)
                .filter(models.Subscriptions.user_id == db_user.user_id)
                .first()
            )
            if db_sub and db_sub.plan_type != "lifetime":
                if db_sub.status != "lapsed":
                    db_sub.status = "cancelled"
                    try:
                        end_str = db_sub.current_period_end.strftime("%B %d, %Y") if db_sub.current_period_end else None
                        send_subscription_cancelled_email(db_user.email, db_user.name, end_str)
                    except Exception as e:
                        print(f"[email] subscription.cancelled email send error: {e}", file=sys.stderr)
        else:
            print(f"[subscription] subscription.cancelled could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "subscription.past_due":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)
            db_sub = _get_user_subscription(db, db_user.user_id)
            if db_sub and db_sub.plan_type != "lifetime" and db_sub.status in ("active", "past_due"):
                db_sub.status = "past_due"
                if incoming_dodo_sid and (
                    not db_sub.dodo_subscription_id or db_sub.dodo_subscription_id == incoming_dodo_sid
                ):
                    db_sub.dodo_subscription_id = incoming_dodo_sid
        else:
            print(f"[subscription] subscription.past_due could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "subscription.on_hold":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

            db_sub = _get_user_subscription(db, db_user.user_id)

            if db_sub and db_sub.plan_type == "lifetime":
                if incoming_dodo_sid:
                    _cancel_dodo_subscription(incoming_dodo_sid)
            elif db_sub:
                if incoming_dodo_sid and (
                    not db_sub.dodo_subscription_id or db_sub.dodo_subscription_id == incoming_dodo_sid
                ):
                    db_sub.dodo_subscription_id = incoming_dodo_sid
                _lapse_subscription_with_grace(db_user, db_sub)
        else:
            print(f"[subscription] subscription.on_hold could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "subscription.expired":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)
            db_sub = _get_user_subscription(db, db_user.user_id)
            if db_sub and db_sub.plan_type == "lifetime":
                if incoming_dodo_sid:
                    _cancel_dodo_subscription(incoming_dodo_sid)
            elif db_sub:
                _lapse_subscription_with_grace(db_user, db_sub)
        else:
            print(f"[subscription] subscription.expired could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "subscription.renewed":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        incoming_dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=incoming_dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

            effective_tier, effective_cycle = _resolve_tier_and_cycle(event_data)

            db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first()

            if db_sub and db_sub.plan_type == "lifetime":
                if incoming_dodo_sid:
                    _cancel_dodo_subscription(incoming_dodo_sid)
            else:
                incoming_start = _prop_get(event_data, "previous_billing_date")
                incoming_end = _prop_get(event_data, "next_billing_date")
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
                        if effective_tier:
                            db_sub.tier = effective_tier
                            db_sub.billing_cycle = effective_cycle
                    db_sub.pending_tier = None
                    db_sub.pending_billing_cycle = None

                else:
                    db_sub = models.Subscriptions(
                        user_id=db_user.user_id,
                        dodo_subscription_id=incoming_dodo_sid,
                        plan_type="pro",
                        status="active",
                        tier=effective_tier,
                        billing_cycle=effective_cycle,
                        current_period_start=_to_aware_dt(incoming_start),
                        current_period_end=_to_aware_dt(incoming_end),
                    )

                    db.add(db_sub)

                # Restore domain from grace/expired back to active on renewal
                _restore_user_domain_access(db_user)

                if db_sub and incoming_dodo_sid:
                    db.query(models.Transactions).filter(
                        models.Transactions.user_id == db_user.user_id,
                        models.Transactions.subscription_id.is_(None),
                    ).update(
                        {"subscription_id": db_sub.subscription_id},
                        synchronize_session=False,
                    )
        else:
            print(f"[subscription] subscription.renewed could not resolve user sid={incoming_dodo_sid}", file=sys.stderr)

    elif event_type == "payment.succeeded":
        event_metadata = _prop_get(event_data, "metadata") or {}
        customer = _prop_get(event_data, "customer")
        dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db,
            metadata=event_metadata,
            customer=customer,
            subscription_id=dodo_sid,
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

            db_sub = None
            if dodo_sid:
                db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == dodo_sid).first())

            if db_sub is None:
                db_sub = (db.query(models.Subscriptions).filter(models.Subscriptions.user_id == db_user.user_id).first())

            payment_id = _prop_get(event_data, "payment_id")

            if payment_id:
                existing = db.query(models.Transactions).filter(
                    models.Transactions.dodo_payment_id == payment_id
                ).first()
            else:
                existing = None

            if existing:
                transaction = existing
                transaction.status = "succeeded"
            else:
                transaction = models.Transactions(
                    user_id=db_user.user_id,
                    subscription_id=db_sub.subscription_id if db_sub else None,
                    dodo_payment_id=payment_id,
                    amount=_prop_get(event_data, "total_amount", 0),
                    currency=_prop_get(event_data, "currency", "USD"),
                    status="succeeded",
                )
            db.add(transaction)

            if payment_id:
                product_cart = _prop_get(event_data, "product_cart")

                if not product_cart:
                    payment = _retrieve_payment(payment_id)
                    product_cart = _prop_get(payment, "product_cart") if payment else None

                is_lifetime = _is_lifetime_product_cart(product_cart)

                if not is_lifetime and not dodo_sid:
                    payment = _retrieve_payment(payment_id)
                    payment_sub_id = _prop_get(payment, "subscription_id")
                    if payment_sub_id:
                        dodo_sid = payment_sub_id
                        if not transaction.subscription_id:
                            tx_sub = db.query(models.Subscriptions).filter(models.Subscriptions.dodo_subscription_id == dodo_sid).first()
                            if tx_sub:
                                transaction.subscription_id = tx_sub.subscription_id

                if is_lifetime:
                    if db_sub and db_sub.dodo_subscription_id:
                        _cancel_dodo_subscription(db_sub.dodo_subscription_id)

                    _restore_user_domain_access(db_user)

                    if db_sub:
                        db_sub.plan_type = "lifetime"
                        db_sub.tier = None
                        db_sub.status = "active"
                        db_sub.current_period_end = None
                    else:
                        db_sub = models.Subscriptions(
                            user_id=db_user.user_id,
                            dodo_subscription_id=None,
                            plan_type="lifetime",
                            status="active",
                            tier=None,
                            current_period_start=_to_aware_dt(_prop_get(event_data, "created_at")),
                            current_period_end=None,
                        )
                        db.add(db_sub)
        else:
            print(f"[payment] payment.succeeded could not resolve user payment_id={_prop_get(event_data, 'payment_id')}", file=sys.stderr)

    elif event_type == "payment.failed":
        customer = _prop_get(event_data, "customer")
        metadata = _prop_get(event_data, "metadata")
        dodo_sid = _prop_get(event_data, "subscription_id")

        db_user = _resolve_user_from_metadata_or_customer(
            db, metadata=metadata, customer=customer, subscription_id=dodo_sid
        )

        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

            db_sub = (
                db.query(models.Subscriptions)
                .filter(models.Subscriptions.user_id == db_user.user_id)
                .first()
            )
            if db_sub and db_sub.plan_type != "lifetime":
                db_sub.status = "past_due"
            try:
                send_payment_failed_email(db_user.email, db_user.name)
            except Exception as e:
                print(f"[email] payment.failed email send error: {e}", file=sys.stderr)
        else:
            print(f"[payment] payment.failed could not resolve user sid={dodo_sid}", file=sys.stderr)

    elif event_type == "refund.succeeded":
        payment_id = _prop_get(event_data, "payment_id")
        refund_id = _prop_get(event_data, "refund_id")
        is_partial = bool(_prop_get(event_data, "is_partial", False))

        existing_tx, db_user, db_sub = _resolve_payment_context(db, payment_id, event_data)
        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

        _apply_transaction_status(existing_tx, "partially_refunded" if is_partial else "refunded")

        payment = _retrieve_payment(payment_id)
        if not db_user and payment:
            db_user = _resolve_user_from_metadata_or_customer(
                db,
                metadata=_prop_get(payment, "metadata"),
                customer=_prop_get(payment, "customer"),
            )
            db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None

        is_lifetime = _is_lifetime_product_cart(_prop_get(payment, "product_cart") if payment else None)
        if not is_partial and is_lifetime:
            if db_user and db_sub:
                _revoke_current_lifetime_access(db_user, db_sub)
        elif not is_lifetime and not payment:
            print(
                f"[refund] unable to inspect payment_id={payment_id} for refund_id={refund_id}",
                file=sys.stderr,
            )

    elif event_type == "refund.failed":
        payment_id = _prop_get(event_data, "payment_id")
        refund_id = _prop_get(event_data, "refund_id")
        existing_tx, db_user, _db_sub = _resolve_payment_context(db, payment_id, event_data)
        if db_user:
            _capture_dodo_customer_id(event_data, db_user)

        print(f"[refund] refund.failed for payment_id={payment_id} refund_id={refund_id}", file=sys.stderr)

    elif event_type in {
        "dispute.opened",
        "dispute.challenged",
        "dispute.accepted",
        "dispute.cancelled",
        "dispute.expired",
        "dispute.won",
        "dispute.lost",
    }:
        payment_id = _prop_get(event_data, "payment_id")
        dispute_id = _prop_get(event_data, "dispute_id")
        dispute_status_raw = _prop_get(event_data, "dispute_status")

        status_map = {
            "dispute.opened": models.TransactionStatus.DISPUTE_OPENED.value,
            "dispute.challenged": models.TransactionStatus.DISPUTE_CHALLENGED.value,
            "dispute.accepted": models.TransactionStatus.DISPUTE_ACCEPTED.value,
            "dispute.cancelled": models.TransactionStatus.DISPUTE_CANCELLED.value,
            "dispute.expired": models.TransactionStatus.DISPUTE_EXPIRED.value,
            "dispute.won": models.TransactionStatus.DISPUTE_WON.value,
            "dispute.lost": models.TransactionStatus.DISPUTE_LOST.value,
        }

        valid_statuses = {e.value for e in models.TransactionStatus}
        target_status = dispute_status_raw if dispute_status_raw in valid_statuses else status_map.get(event_type, models.TransactionStatus.DISPUTE_OPENED.value)

        existing_tx, db_user, db_sub = _resolve_payment_context(db, payment_id)
        if existing_tx:
            _apply_transaction_status(existing_tx, target_status)
        else:
            print(
                f"[dispute] {event_type} without local transaction payment_id={payment_id} dispute_id={dispute_id}",
                file=sys.stderr,
            )

        is_adverse_dispute = event_type in {"dispute.accepted", "dispute.expired", "dispute.lost"}
        is_resolved_dispute = event_type in {"dispute.won", "dispute.cancelled"}
        if is_adverse_dispute and payment_id:
            payment = _retrieve_payment(payment_id)
            if not db_user and payment:
                db_user = _resolve_user_from_metadata_or_customer(
                    db,
                    metadata=_prop_get(payment, "metadata"),
                    customer=_prop_get(payment, "customer"),
                )
                db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None

            is_lifetime = _is_lifetime_product_cart(_prop_get(payment, "product_cart") if payment else None)
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
        elif is_resolved_dispute and payment_id:
            payment = _retrieve_payment(payment_id)
            if not db_user and payment:
                db_user = _resolve_user_from_metadata_or_customer(
                    db,
                    metadata=_prop_get(payment, "metadata"),
                    customer=_prop_get(payment, "customer"),
                )
                db_sub = _get_user_subscription(db, db_user.user_id) if db_user else None

            is_lifetime = _is_lifetime_product_cart(_prop_get(payment, "product_cart") if payment else None)
            if is_lifetime and db_user and db_sub and db_sub.plan_type == "lifetime" and db_sub.status == "lapsed":
                db_sub.status = "active"
                _restore_user_domain_access(db_user)

    else:
        print(f"[webhook] unhandled event type: {event_type} id={event_id}", file=sys.stderr)

    return True


@router.post("/webhooks/dodo")
async def handle_webhook(request: Request, db: Session = Depends(get_db)):

    raw_body = await request.body()
    raw_text = raw_body.decode("utf-8", errors="replace")

    try:
        event = dodo_client.webhooks.unwrap(
            raw_text,
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
        process_webhook_event(db, event_type, event.data, event_id)
        db_webhook.processed = True
        db.commit()
        return {"detail": "processed"}

    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="temporary failure")
@router.get("/subscription", response_model=SubscriptionOut)
def get_my_subscription(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):

    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()

    if not db_sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    out = SubscriptionOut.model_validate(db_sub)

    if (
        db_sub.plan_type == "pro"
        and db_sub.status == "active"
        and not _subscription_has_charge(db, db_sub.subscription_id)
    ):
        out.trial_ends_at = db_sub.current_period_end

    return out


@router.post("/cancel", response_model=SubscriptionOut, status_code=status.HTTP_200_OK)
def cancel_my_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()
    if not db_sub or db_sub.plan_type != "pro" or db_sub.status not in ("active", "past_due"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Pro subscription to cancel.",
        )

    if db_sub.dodo_subscription_id:
        try:
            dodo_client.subscriptions.update(
                db_sub.dodo_subscription_id,
                cancel_at_next_billing_date=True,
            )
        except Exception as e:
            print(f"[billing] error cancelling Dodo subscription {db_sub.dodo_subscription_id}: {e}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to cancel subscription with payment provider.",
            )

    db_sub.status = "cancelled"
    db.commit()
    db.refresh(db_sub)
    return db_sub

@router.get("/transactions", response_model=List[TransactionOut])
def get_my_transactions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):

    transactions = db.query(models.Transactions).filter(models.Transactions.user_id == current_user.user_id).order_by(models.Transactions.created_at.desc()).all()

    return transactions


@router.get("/customer-portal", response_model=CustomerPortalResponse)
def get_customer_portal(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
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
    
    db_sub = db.query(models.Subscriptions).filter(models.Subscriptions.user_id == current_user.user_id).first()
    plan_type = db_sub.plan_type if db_sub else "pro"
    billing_cycle = db_sub.billing_cycle if db_sub and db_sub.billing_cycle else None
    tier_key = db_sub.tier if db_sub and db_sub.tier else None

    if tier_key in TIERS:
        tier_limit = TIERS[tier_key]["views"]
        cycle = billing_cycle or "monthly"
        price = TIERS[tier_key][cycle] if cycle in ("monthly", "yearly") else TIERS[tier_key]["monthly"]
    elif plan_type == "lifetime":
        tier_limit = 100_000
        price = 99
    else:
        tier_limit = 10_000
        price = 19

    # The traffic allowance is a calendar month, independent of the billing cycle.
    start_at, end_at = get_umami_period_timestamps("this_month")

    umami_client = UmamiClient()

    sites = db.query(models.Site).filter(models.Site.user_id == current_user.user_id).all()
    site_items = []
    total_views = 0

    for site in sites:
        views = 0
        if site.umami_website_id and umami_client.configured:
            try:
                stats = umami_client.get_website_stats_sync(site.umami_website_id, start_at=start_at, end_at=end_at)
                views = stats.get("pageviews", 0)
            except Exception:
                views = 0

        total_views += views
        site_items.append({
            "site_id": site.site_id,
            "subdomain": site.subdomain,
            "site_name": site.site_name or site.subdomain,
            "pageviews": views,
        })

    if tier_limit is not None and tier_limit > 0:
        usage_pct = min(100.0, round((total_views / tier_limit * 100), 1))
    else:
        usage_pct = None

    return {
        "total_pageviews": total_views,
        "tier_limit": tier_limit,
        "plan_type": plan_type,
        "tier_price_usd": price,
        "billing_cycle": billing_cycle,
        "usage_percentage": usage_pct,
        "sites": site_items,
    }
