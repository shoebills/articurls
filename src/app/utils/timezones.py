"""Timezone helpers (IANA validation shared across schemas and routers)."""
from zoneinfo import ZoneInfo


def normalize_timezone(value: str | None) -> str | None:
    """Return a clean IANA timezone string, or None when absent/invalid.

    Invalid user input never raises — it degrades to None (UTC fallback).
    """
    if not value:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        ZoneInfo(cleaned)
        return cleaned
    except Exception:
        return None
