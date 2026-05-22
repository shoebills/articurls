"""
Domainee webhook handler.

Register once:
  POST https://api.domainee.dev/v1/webhook-endpoints
  { "url": "https://api.articurls.com/webhooks/domainee",
    "events": ["domain.verified", "domain.failed", "domain.expired"] }

Envelope (all events):
  { "id", "type", "createdAt", "data": { ... } }

domain.verified data shape:
  { "id": "<domainee-domain-id>", "hostname": "...", "status": "verified" }
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from standardwebhooks import Webhook, WebhookVerificationError

from ..config import settings
from ..database import get_db
from .. import models
from .client import unwrap_domain
from .status import is_verified

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Domainee Webhooks"])


def _invalidate_domain_cache(hostname: str) -> None:
    try:
        from ..redis_client import redis_client
        redis_client.delete(f"domain_lookup:{hostname}")
    except Exception:
        pass


def _activate_user(db: Session, user: models.User) -> None:
    user.domain_status = models.DomainStatus.ACTIVE
    user.is_domain_verified = True
    user.verified_at = datetime.now(timezone.utc)
    user.domain_dns_instructions = None
    db.commit()
    if user.custom_domain:
        _invalidate_domain_cache(user.custom_domain)


def _find_user_for_domain(db: Session, domain: dict) -> Optional[models.User]:
    domain_id = domain.get("id")
    if domain_id:
        user = (
            db.query(models.User)
            .filter(models.User.domainee_domain_id == domain_id)
            .first()
        )
        if user:
            return user
    hostname = (domain.get("hostname") or "").lower()
    if hostname:
        return (
            db.query(models.User)
            .filter(models.User.custom_domain == hostname)
            .first()
        )
    metadata = domain.get("metadata") or {}
    user_id = metadata.get("user_id")
    if user_id is not None:
        return db.query(models.User).filter(models.User.user_id == int(user_id)).first()
    return None


@router.post("/webhooks/domainee", status_code=status.HTTP_200_OK)
async def handle_domainee_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    secret = settings.domainee_webhook_secret

    if secret:
        try:
            wh = Webhook(secret)
            payload = wh.verify(
                body.decode("utf-8"),
                {
                    "webhook-id": request.headers.get("webhook-id", ""),
                    "webhook-signature": request.headers.get("webhook-signature", ""),
                    "webhook-timestamp": request.headers.get("webhook-timestamp", ""),
                },
            )
        except WebhookVerificationError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")
    else:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    event_type = payload.get("type") or ""
    data = payload.get("data")
    if not isinstance(data, dict):
        logger.warning("Domainee webhook %s: missing data object", event_type)
        return {"ok": True, "ignored": True}

    # domain.verified sends { id, hostname, status } directly in data (no nested "domain" key)
    domain = unwrap_domain(data) or data

    user = _find_user_for_domain(db, domain)
    if not user:
        logger.warning("Domainee webhook %s: no user for domain %s", event_type, domain.get("id"))
        return {"ok": True, "ignored": True}

    if event_type == "domain.verified":
        if is_verified(domain) and user.domain_status != models.DomainStatus.ACTIVE:
            _activate_user(db, user)
            if user.custom_domain:
                from ..vercel.client import VercelClient
                VercelClient().verify_project_domain_sync(user.custom_domain)
        return {"ok": True, "activated": user.user_id}

    if event_type == "domain.expired" and user.domain_status in (
        models.DomainStatus.ACTIVE,
        models.DomainStatus.GRACE,
    ):
        user.domain_status = models.DomainStatus.EXPIRED
        user.is_domain_verified = False
        db.commit()
        if user.custom_domain:
            _invalidate_domain_cache(user.custom_domain)
        logger.info("Domainee domain.expired for user %s", user.user_id)
        return {"ok": True, "expired": user.user_id}

    if event_type == "domain.failed":
        logger.info("Domainee domain.failed for user %s (domain %s)", user.user_id, domain.get("id"))

    return {"ok": True}
