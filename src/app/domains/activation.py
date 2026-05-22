"""
Custom domain activation — Cloudflare Custom Hostnames + Vercel hostname registration.

Fully active only when CF hostname + SSL are active AND Vercel has verified the hostname.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from .. import models
from ..vercel.client import append_vercel_dns_instructions
from .cf_dns import extract_dns_instructions, is_cloudflare_ready, merge_dns_instructions
from .schemas import DNSRecord, DomainVerifyOut

logger = logging.getLogger(__name__)

VERCEL_PENDING_MESSAGE = (
    "Cloudflare is connected. Add the Vercel domain verification TXT record "
    "at your registrar (shown below), then click Verify again."
)


def vercel_sync_required() -> bool:
    from ..config import settings

    return bool(settings.vercel_api_token and settings.vercel_project_name)


def is_vercel_verified(hostname: str) -> bool:
    if not vercel_sync_required():
        return True
    from ..vercel.client import VercelClient

    return VercelClient().is_project_domain_verified_sync(hostname)


def try_vercel_verify(hostname: str) -> bool:
    if not vercel_sync_required():
        return True
    from ..vercel.client import VercelClient

    vc = VercelClient()
    vc.ensure_project_domain_sync(hostname)
    if vc.is_project_domain_verified_sync(hostname):
        return True
    result = vc.verify_project_domain_sync(hostname)
    if result and result.get("verified"):
        return True
    return vc.is_project_domain_verified_sync(hostname)


def build_dns_instructions(cf_result: dict, hostname: str) -> List[DNSRecord]:
    base = extract_dns_instructions(cf_result, hostname)
    return append_vercel_dns_instructions(base, hostname)


def pending_dns_for_display(instructions: List[DNSRecord]) -> List[DNSRecord]:
    pending = [r for r in instructions if r.purpose == "vercel" or not r.verified]
    if pending:
        return pending
    vercel_rows = [r for r in instructions if r.purpose == "vercel"]
    return vercel_rows or instructions


def mark_domain_active(db_user: models.User, hostname: str) -> None:
    from datetime import datetime, timezone

    from ..redis_client import redis_client

    db_user.domain_status = models.DomainStatus.ACTIVE
    db_user.is_domain_verified = True
    db_user.verified_at = datetime.now(timezone.utc)
    db_user.domain_dns_instructions = None
    try:
        redis_client.delete(f"domain_lookup:{hostname}")
    except Exception:
        pass


def apply_domain_verification(
    db_user: models.User,
    cf_result: dict,
    cached_instructions: Optional[List[DNSRecord]] = None,
) -> DomainVerifyOut:
    hostname = db_user.custom_domain or ""

    if not is_cloudflare_ready(cf_result):
        fresh = extract_dns_instructions(cf_result, hostname)
        merged = merge_dns_instructions(fresh, cached_instructions)
        instructions = append_vercel_dns_instructions(merged, hostname)
        display = pending_dns_for_display(instructions)
        db_user.domain_status = models.DomainStatus.PENDING
        db_user.is_domain_verified = False
        db_user.domain_dns_instructions = [r.model_dump() for r in display]
        return DomainVerifyOut(
            verification_status="pending",
            domain_status=db_user.domain_status,
            dns_instructions=display,
            message=None,
        )

    if vercel_sync_required():
        try_vercel_verify(hostname)
        if not is_vercel_verified(hostname):
            instructions = build_dns_instructions(cf_result, hostname)
            display = pending_dns_for_display(instructions)
            if not any(r.purpose == "vercel" for r in display):
                logger.warning(
                    "Vercel domain %s unverified but no TXT challenge returned by API",
                    hostname,
                )
            db_user.domain_status = models.DomainStatus.PENDING
            db_user.is_domain_verified = False
            db_user.domain_dns_instructions = [r.model_dump() for r in display]
            return DomainVerifyOut(
                verification_status="pending",
                domain_status=db_user.domain_status,
                dns_instructions=display,
                message=VERCEL_PENDING_MESSAGE,
            )

    mark_domain_active(db_user, hostname)
    return DomainVerifyOut(
        verification_status="verified",
        domain_status=models.DomainStatus.ACTIVE,
        dns_instructions=None,
        message=None,
    )
