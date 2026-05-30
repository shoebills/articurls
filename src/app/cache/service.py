"""
Cloudflare Cache Purge Service

Provides granular cache invalidation for multi-tenant blog platform using
Cache-Tags with automatic cascade purging.
"""

from typing import List, Optional

import requests

from ..config import settings
from ..utils.logger import logger

# Configuration
CLOUDFLARE_API_TOKEN = settings.cloudflare_api_token
CLOUDFLARE_ZONE_ID = settings.cloudflare_zone_id


async def purge_by_tags(zone_id: str, tags: List[str]) -> bool:
    """
    Purge Cloudflare cache by Cache-Tags.

    Args:
        zone_id: Cloudflare zone ID (for custom domains, each has separate zone)
        tags: List of cache tags to purge (max 100 per request)

    Returns:
        True if purge successful, False otherwise
    """
    if not CLOUDFLARE_API_TOKEN or not zone_id:
        logger.warning(
            "Cloudflare API token or zone ID not configured, skipping cache purge"
        )
        return False

    if not tags:
        return True

    # Cloudflare limit: max 100 tags per request
    if len(tags) > 100:
        logger.warning(f"Too many tags ({len(tags)}), truncating to 100")
        tags = tags[:100]

    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache"
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"tags": tags}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if data.get("success"):
            logger.info(f"Cache purged for tags: {tags}")
            return True
        else:
            errors = data.get("errors", [])
            logger.error(f"Cache purge failed: {errors}")
            return False
    except Exception as e:
        logger.error(f"Error purging cache: {str(e)}")
        return False


async def purge_by_hostnames(zone_id: str, hosts: List[str]) -> bool:
    """
    Purge cache by hostname (alternative to tags, works on all plans).

    Args:
        zone_id: Cloudflare zone ID
        hosts: List of hostnames to purge (e.g., ["pabloo.io", "www.pabloo.io"])

    Returns:
        True if purge successful, False otherwise
    """
    if not CLOUDFLARE_API_TOKEN or not zone_id:
        return False

    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache"
    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {"hosts": hosts}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()
        return data.get("success", False)
    except Exception as e:
        logger.error(f"Error purging cache by hostname: {str(e)}")
        return False


async def purge_blog_post(zone_id: str, tenant_host: str, slug: str) -> bool:
    """
    Purge a specific blog post and all listing pages that show it.

    Cascade: post-{slug} + posts-list (home + categories)

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain or username path (e.g., "pabloo.io")
        slug: Blog post slug

    Returns:
        True if purge successful
    """
    tags = [
        f"tenant-{tenant_host}",
        f"post-{slug}",
        "posts-list",  # Cascade: also purge home + category listings
    ]
    return await purge_by_tags(zone_id, tags)


async def purge_custom_page(zone_id: str, tenant_host: str, slug: str) -> bool:
    """
    Purge a specific custom page.

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain
        slug: Page slug

    Returns:
        True if purge successful
    """
    tags = [
        f"tenant-{tenant_host}",
        f"page-{slug}",
    ]
    return await purge_by_tags(zone_id, tags)


async def purge_category(zone_id: str, tenant_host: str, slug: str) -> bool:
    """
    Purge a category page.

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain
        slug: Category slug

    Returns:
        True if purge successful
    """
    tags = [
        f"tenant-{tenant_host}",
        f"category-{slug}",
        "posts-list",  # Category is a listing page
    ]
    return await purge_by_tags(zone_id, tags)


async def purge_homepage(zone_id: str, tenant_host: str) -> bool:
    """
    Purge the tenant's homepage/profile.

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain

    Returns:
        True if purge successful
    """
    tags = [
        f"tenant-{tenant_host}",
        "home",
        "posts-list",  # Home is a listing page
    ]
    return await purge_by_tags(zone_id, tags)


async def purge_all_listings(zone_id: str, tenant_host: str) -> bool:
    """
    Purge all listing pages (home + categories) without purging individual posts.
    Useful when a post is deleted or unpublished.

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain

    Returns:
        True if purge successful
    """
    tags = [
        f"tenant-{tenant_host}",
        "posts-list",
        "home",
    ]
    return await purge_by_tags(zone_id, tags)


async def purge_entire_tenant(zone_id: str, tenant_host: str) -> bool:
    """
    Nuclear option: Purge ALL cached content for a tenant.

    Args:
        zone_id: Cloudflare zone ID
        tenant_host: Tenant's custom domain

    Returns:
        True if purge successful
    """
    tags = [f"tenant-{tenant_host}"]
    return await purge_by_tags(zone_id, tags)


async def purge_across_multiple_zones(
    tenant_hosts: List[str], content_type: str, slug: str
) -> dict:
    """
    Purge content across multiple zones (for tenants with custom domains).

    Args:
        tenant_hosts: List of tenant hosts (e.g., ["pabloo.io", "articurls.com/username"])
        content_type: Type of content ("post", "page", "category")
        slug: Content slug

    Returns:
        Dict with results per host
    """
    # Map of hostname -> zone_id (configure this based on your setup)
    ZONE_MAP = {
        "articurls.com": CLOUDFLARE_ZONE_ID,
        # Add custom domain zones as needed:
        # "pabloo.io": "zone-id-for-pabloo",
    }

    results = {}
    for host in tenant_hosts:
        zone_id = ZONE_MAP.get(host)
        if not zone_id:
            logger.warning(f"No zone ID configured for host: {host}")
            results[host] = False
            continue

        if content_type == "post":
            results[host] = await purge_blog_post(zone_id, host, slug)
        elif content_type == "page":
            results[host] = await purge_custom_page(zone_id, host, slug)
        elif content_type == "category":
            results[host] = await purge_category(zone_id, host, slug)
        else:
            results[host] = await purge_entire_tenant(zone_id, host)

    return results
