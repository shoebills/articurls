import asyncio
import logging
from typing import List, Optional

import httpx
from fastapi import BackgroundTasks

from ..config import settings

logger = logging.getLogger(__name__)


async def _revalidate(tags: List[str]) -> bool:
    if not tags:
        return True

    origin = (settings.marketing_origin or "").rstrip("/")
    if not origin:
        logger.warning("marketing_origin not configured, skipping revalidate")
        return False

    secret = settings.internal_api_secret
    if not secret:
        logger.warning("internal_api_secret not configured, skipping revalidate")
        return False

    url = f"{origin}/api/revalidate"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"tags": tags},
                headers={
                    "x-internal-secret": secret,
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                logger.info("Revalidated tags: %s", tags)
                return True
            logger.warning(
                "Revalidate failed with status %s: %s",
                response.status_code,
                response.text,
            )
            return False
    except Exception as e:
        logger.error("Error calling revalidate endpoint: %s", e)
        return False


async def purge_blog_post(tenant_host: str, slug: str) -> bool:
    tags = [
        f"tenant-{tenant_host}",
        f"post-{slug}",
        "posts-list",
    ]
    return await _revalidate(tags)


async def purge_custom_page(tenant_host: str, slug: str) -> bool:
    tags = [
        f"tenant-{tenant_host}",
        f"page-{slug}",
    ]
    return await _revalidate(tags)


async def purge_category(tenant_host: str, slug: str) -> bool:
    tags = [
        f"tenant-{tenant_host}",
        f"category-{slug}",
        "posts-list",
    ]
    return await _revalidate(tags)


async def purge_homepage(tenant_host: str) -> bool:
    tags = [
        f"tenant-{tenant_host}",
        "home",
        "posts-list",
    ]
    return await _revalidate(tags)


async def purge_all_listings(tenant_host: str) -> bool:
    tags = [
        f"tenant-{tenant_host}",
        "posts-list",
        "home",
    ]
    return await _revalidate(tags)


async def purge_entire_tenant(tenant_host: str) -> bool:
    tags = [f"tenant-{tenant_host}"]
    return await _revalidate(tags)


def _tenant_hosts(site) -> List[str]:
    hosts = []
    if site.custom_domain:
        hosts.append(site.custom_domain)
    if site.subdomain:
        hosts.append(f"{site.subdomain}.{settings.ugc_domain}")
    return hosts


def schedule_post_purge(background_tasks: BackgroundTasks, site, slug: str) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_blog_post, host, slug)


def schedule_page_purge(background_tasks: BackgroundTasks, site, slug: str) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_custom_page, host, slug)


def schedule_category_purge(background_tasks: BackgroundTasks, site, slug: str) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_category, host, slug)


def schedule_homepage_purge(background_tasks: BackgroundTasks, site) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_homepage, host)


def schedule_tenant_purge(background_tasks: BackgroundTasks, site) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_entire_tenant, host)
