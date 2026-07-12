"""Build dashboard DNS rows from Cloudflare Custom Hostname API responses."""
from typing import List

from ..config import settings
from .schemas import DNSRecord


def is_cloudflare_ready(cf_result: dict) -> bool:
    ssl_info = cf_result.get("ssl") or {}
    return cf_result.get("status") == "active" and ssl_info.get("status") == "active"


def extract_dns_instructions(cf_result: dict, hostname: str) -> List[DNSRecord]:
    dns_instructions: List[DNSRecord] = []

    ownership = cf_result.get("ownership_verification") or {}
    ownership_verified = cf_result.get("status") == "active"
    if ownership.get("name") and ownership.get("value"):
        dns_instructions.append(
            DNSRecord(
                type="TXT",
                name=ownership["name"],
                value=ownership["value"],
                purpose="ownership",
                verified=ownership_verified,
            )
        )

    ssl_info = cf_result.get("ssl") or {}
    ssl_active = ssl_info.get("status") == "active"

    dcv_delegation = ssl_info.get("dcv_delegation_records") or []
    if dcv_delegation:
        for dcv in dcv_delegation:
            if dcv.get("cname") and dcv.get("cname_target"):
                dns_instructions.append(
                    DNSRecord(
                        type="CNAME",
                        name=dcv["cname"],
                        value=dcv["cname_target"],
                        purpose="ssl",
                        verified=ssl_active,
                    )
                )
    else:
        for record in ssl_info.get("validation_records") or []:
            if record.get("txt_name") and record.get("txt_value"):
                record_verified = ssl_active or record.get("status") == "active"
                dns_instructions.append(
                    DNSRecord(
                        type="TXT",
                        name=record["txt_name"],
                        value=record["txt_value"],
                        purpose="ssl",
                        verified=record_verified,
                    )
                )

    dns_instructions.append(
        DNSRecord(
            type="CNAME",
            name=hostname,
            value=settings.cloudflare_fallback_origin,
            purpose="routing",
            verified=ownership_verified,
        )
    )

    return dns_instructions


def merge_dns_instructions(
    fresh: List[DNSRecord],
    cached: List[DNSRecord] | None,
) -> List[DNSRecord]:
    """Merge fresh CF rows with cached rows that disappeared (= verified at CF)."""
    fresh_keys = {(r.name, r.value) for r in fresh}
    merged: List[DNSRecord] = list(fresh)

    if cached:
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
