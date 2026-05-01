import re
from fastapi import HTTPException, status

# articurls.com and any subdomain of it are reserved
_RESERVED_RE = re.compile(r"(^|\.)articurls\.com$", re.IGNORECASE)

# Valid hostname label: letters, digits, hyphens; no leading/trailing hyphen
_HOSTNAME_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$"
)


def normalize_hostname(raw: str) -> str:
    host = raw.strip().lower()
    # strip protocol if someone pastes a full URL
    for prefix in ("https://", "http://"):
        if host.startswith(prefix):
            host = host[len(prefix):]
    # strip path/query
    host = host.split("/")[0].split("?")[0].split("#")[0]
    # strip trailing dot
    host = host.rstrip(".")
    return host


def validate_hostname(hostname: str) -> None:
    if not _HOSTNAME_RE.match(hostname):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid hostname format.",
        )

    parts = hostname.split(".")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Root domains are not supported. Use a subdomain (e.g. blog.example.com).",
        )

    if _RESERVED_RE.search(hostname):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="articurls.com domains cannot be used as custom domains.",
        )
