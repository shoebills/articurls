import logging
from typing import List

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


def _domain_tags(hosts: List[str]) -> List[str]:
    tags = ["domains"]
    for host in hosts:
        if host:
            tags.append(f"domain-{host}")
            tags.append(f"tenant-{host}")
    return tags


async def purge_domain_lookup_tags(hosts: List[str]) -> bool:
    """Revalidate domain-lookup data cache + tenant edge-cache tags for hostnames."""
    return await _revalidate(_domain_tags(hosts))


def purge_domain_lookup_tags_sync(hosts: List[str]) -> bool:
    """Synchronous variant for Celery tasks / sync webhook helpers."""
    tags = _domain_tags(hosts)
    if not tags:
        return True

    origin = (settings.marketing_origin or "").rstrip("/")
    secret = settings.internal_api_secret
    if not origin or not secret:
        logger.warning(
            "marketing_origin/internal_api_secret not configured, skipping domain tag revalidate"
        )
        return False

    url = f"{origin}/api/revalidate"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                json={"tags": tags},
                headers={
                    "x-internal-secret": secret,
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                logger.info("Revalidated domain tags: %s", tags)
                return True
            logger.warning(
                "Domain tag revalidate failed with status %s: %s",
                response.status_code,
                response.text,
            )
            return False
    except Exception as e:
        logger.error("Error revalidating domain tags: %s", e)
        return False


async def purge_tenant(tenant_host: str) -> bool:
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
        background_tasks.add_task(purge_tenant, host)
    if getattr(site, "subdomain", None):
        background_tasks.add_task(
            _revalidate,
            [f"subdomain-{site.subdomain}", f"post-{site.subdomain}-{slug}", f"posts-list-{site.subdomain}"],
        )


def schedule_page_purge(background_tasks: BackgroundTasks, site, slug: str) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_tenant, host)
    if getattr(site, "subdomain", None):
        background_tasks.add_task(
            _revalidate,
            [f"subdomain-{site.subdomain}", f"page-{site.subdomain}-{slug}", f"pages-list-{site.subdomain}"],
        )


def schedule_category_purge(background_tasks: BackgroundTasks, site, slug: str) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_tenant, host)
    if getattr(site, "subdomain", None):
        background_tasks.add_task(
            _revalidate,
            [f"subdomain-{site.subdomain}", f"category-{site.subdomain}-{slug}", f"posts-list-{site.subdomain}"],
        )


def schedule_homepage_purge(background_tasks: BackgroundTasks, site) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_tenant, host)
    if getattr(site, "subdomain", None):
        background_tasks.add_task(
            _revalidate,
            [f"subdomain-{site.subdomain}", f"home-{site.subdomain}", f"posts-list-{site.subdomain}"],
        )


def schedule_tenant_purge(background_tasks: BackgroundTasks, site) -> None:
    for host in _tenant_hosts(site):
        background_tasks.add_task(purge_tenant, host)
    if getattr(site, "subdomain", None):
        background_tasks.add_task(
            _revalidate,
            [
                f"subdomain-{site.subdomain}",
                f"posts-list-{site.subdomain}",
                f"site-settings-{site.subdomain}",
                f"pages-list-{site.subdomain}",
                f"categories-list-{site.subdomain}",
                f"redirects-{site.subdomain}",
            ],
        )


async def purge_tenant_now(site) -> dict:
    """Synchronous full-tenant purge for the manual Clear Cache action."""
    revalidated = []
    failed = []

    for host in _tenant_hosts(site):
        if await purge_tenant(host):
            revalidated.append(host)
        else:
            failed.append(host)

    if getattr(site, "subdomain", None):
        tags = [
            f"subdomain-{site.subdomain}",
            f"posts-list-{site.subdomain}",
            f"site-settings-{site.subdomain}",
            f"pages-list-{site.subdomain}",
            f"categories-list-{site.subdomain}",
            f"redirects-{site.subdomain}",
        ]
        if await _revalidate(tags):
            revalidated.append(f"subdomain-{site.subdomain}")
        else:
            failed.append(f"subdomain-{site.subdomain}")

    return {"revalidated": revalidated, "failed": failed}
