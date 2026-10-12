from urllib.parse import urlparse
from typing import Union
from sqlalchemy.orm import Session

from .. import models
from ..config import settings


def _ugc_subdomain(target: Union[models.Site, models.User, str]) -> str:
    subdomain = ""
    if isinstance(target, str):
        subdomain = target
    elif hasattr(target, "subdomain") and target.subdomain:
        subdomain = target.subdomain
    elif hasattr(target, "sites") and target.sites:
        first_site = target.sites[0]
        if hasattr(first_site, "subdomain") and first_site.subdomain:
            subdomain = first_site.subdomain

    parsed = urlparse(settings.ugc_origin)
    port = f":{parsed.port}" if parsed.port else ""
    if not subdomain:
        return f"{parsed.scheme}://{parsed.hostname}{port}"
    return f"{parsed.scheme}://{subdomain}.{parsed.hostname}{port}"


def public_blog_home_url(site: Union[models.Site, models.User]) -> str:
    if not site:
        return ""

    actual_site = site
    if hasattr(site, "sites") and site.sites:
        actual_site = site.sites[0]
    elif isinstance(site, models.User):
        return ""

    domain_status_attr = getattr(actual_site, "domain_status", None)
    domain_status = str(domain_status_attr.value if hasattr(domain_status_attr, "value") else (domain_status_attr or ""))
    subpath = getattr(actual_site, "custom_subpath", None)
    clean_subpath = f"/{subpath.strip('/')}" if subpath and subpath.strip('/') else ""

    if getattr(actual_site, "custom_domain", None) and domain_status in ("active", "grace"):
        return f"https://{actual_site.custom_domain}{clean_subpath}/"

    return f"{_ugc_subdomain(actual_site)}{clean_subpath}/"


def public_post_url(site: Union[models.Site, models.User], blog: models.Blog, _db: Session = None) -> str:
    if not site:
        return ""

    actual_site = site
    if hasattr(site, "sites") and site.sites:
        actual_site = site.sites[0]
    elif isinstance(site, models.User):
        return ""

    domain_status_attr = getattr(actual_site, "domain_status", None)
    domain_status = str(domain_status_attr.value if hasattr(domain_status_attr, "value") else (domain_status_attr or ""))
    subpath = getattr(actual_site, "custom_subpath", None)
    clean_subpath = f"/{subpath.strip('/')}" if subpath and subpath.strip('/') else ""

    if (
        getattr(actual_site, "custom_domain", None)
        and domain_status in ("active", "grace")
    ):
        return f"https://{actual_site.custom_domain}{clean_subpath}/{blog.slug}"

    return f"{_ugc_subdomain(actual_site)}{clean_subpath}/{blog.slug}"
