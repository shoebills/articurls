from __future__ import annotations

import logging
from typing import List, Optional

from .. import models
from ..vercel.client import VercelClient, vercel_verification_records
from .schemas import DNSRecord, DomainVerifyOut

logger = logging.getLogger(__name__)

VERCEL_PENDING_MESSAGE = (
    "Add the Vercel domain verification TXT record at your registrar "
    "(shown below), then click Verify again."
)

VERCEL_CNAME_TARGET = "7ee24e1b6a5ccf21.vercel-dns-017.com"
VERCEL_APEX_IP = "76.76.21.21"


def _is_apex(hostname: str) -> bool:
    return hostname.count(".") == 1


def vercel_sync_required() -> bool:
    from ..config import settings

    return bool(settings.vercel_api_token and settings.vercel_project_name)


def is_vercel_verified(hostname: str) -> bool:
    if not vercel_sync_required():
        return True
    return VercelClient().is_project_domain_verified_sync(hostname)


def try_vercel_verify(hostname: str, vercel_domain: Optional[dict] = None) -> bool:
    if not vercel_sync_required():
        return True
    vc = VercelClient()
    if vercel_domain is None:
        vc.ensure_project_domain_sync(hostname)
    if vc.is_project_domain_verified_sync(hostname):
        return True
    result = vc.verify_project_domain_sync(hostname)
    if result and result.get("verified"):
        return True
    return vc.is_project_domain_verified_sync(hostname)


def build_dns_instructions(hostname: str, vercel_domain_info: Optional[dict] = None) -> List[DNSRecord]:
    if _is_apex(hostname):
        record = DNSRecord(
            type="A",
            name="@",
            value=VERCEL_APEX_IP,
            purpose="routing",
            verified=False,
        )
    else:
        sub = hostname.split(".", 1)[0]
        record = DNSRecord(
            type="CNAME",
            name=sub,
            value=VERCEL_CNAME_TARGET,
            purpose="routing",
            verified=False,
        )
    instructions: List[DNSRecord] = [record]
    if vercel_domain_info:
        extra = vercel_verification_records(vercel_domain_info, hostname)
        if extra:
            instructions.extend(DNSRecord(**row) for row in extra)
    return instructions


def mark_domain_active(db_user: models.User, hostname: str) -> None:
    from datetime import datetime, timezone

    from ..redis_client import redis_client

    db_user.domain_status = models.DomainStatus.ACTIVE
    db_user.verified_at = datetime.now(timezone.utc)
    db_user.domain_dns_instructions = None
    try:
        redis_client.delete(f"domain_lookup:{hostname}")
    except Exception:
        pass

    from ..umami.service import enqueue_umami_domain_sync

    enqueue_umami_domain_sync(db_user.user_id)


def apply_domain_verification(
    db_user: models.User,
    vercel_domain: Optional[dict] = None,
    cached_instructions: Optional[List[DNSRecord]] = None,
) -> DomainVerifyOut:
    hostname = db_user.custom_domain or ""

    if not vercel_sync_required():
        mark_domain_active(db_user, hostname)
        return DomainVerifyOut(
            verification_status="verified",
            domain_status=models.DomainStatus.ACTIVE,
            dns_instructions=None,
            message=None,
        )

    try_vercel_verify(hostname, vercel_domain)
    if is_vercel_verified(hostname):
        mark_domain_active(db_user, hostname)
        return DomainVerifyOut(
            verification_status="verified",
            domain_status=models.DomainStatus.ACTIVE,
            dns_instructions=None,
            message=None,
        )

    instructions = build_dns_instructions(hostname, vercel_domain)
    merged = _merge_instructions(instructions, cached_instructions)
    db_user.domain_status = models.DomainStatus.PENDING
    db_user.domain_dns_instructions = [r.model_dump() for r in merged]
    return DomainVerifyOut(
        verification_status="pending",
        domain_status=db_user.domain_status,
        dns_instructions=merged,
        message=VERCEL_PENDING_MESSAGE,
    )


def _merge_instructions(
    fresh: List[DNSRecord],
    cached: Optional[List[DNSRecord]],
) -> List[DNSRecord]:
    if not cached:
        return fresh
    fresh_keys = {(r.name, r.value) for r in fresh}
    merged: List[DNSRecord] = list(fresh)
    for cached_record in cached:
        if (cached_record.name, cached_record.value) not in fresh_keys:
            merged.append(
                DNSRecord(
                    type=cached_record.type,
                    name=cached_record.name,
                    value=cached_record.value,
                    purpose=cached_record.purpose,
                    verified=True,
                )
            )
    merged.sort(key=lambda r: (r.purpose == "routing", r.verified))
    return merged
