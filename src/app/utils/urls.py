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

    parsed = urlparse(settings.ugc_origin)
    port = f":{parsed.port}" if parsed.port else ""
    return f"{parsed.scheme}://{subdomain}.{parsed.hostname}{port}"


def public_blog_home_url(site: Union[models.Site, models.User]) -> str:
    domain_status = str(
        site.domain_status.value if hasattr(site.domain_status, "value") else getattr(site, "domain_status", "")
    )
    subpath = getattr(site, "custom_subpath", None)
    clean_subpath = f"/{subpath.strip('/')}" if subpath and subpath.strip('/') else ""

    if getattr(site, "custom_domain", None) and domain_status in ("active", "grace"):
        return f"https://{site.custom_domain}{clean_subpath}/"

    return f"{_ugc_subdomain(site)}{clean_subpath}/"


def public_post_url(site: Union[models.Site, models.User], blog: models.Blog, _db: Session = None) -> str:
    domain_status = str(
        site.domain_status.value if hasattr(site.domain_status, "value") else getattr(site, "domain_status", "")
    )
    subpath = getattr(site, "custom_subpath", None)
    clean_subpath = f"/{subpath.strip('/')}" if subpath and subpath.strip('/') else ""

    if (
        getattr(site, "custom_domain", None)
        and domain_status in ("active", "grace")
    ):
        return f"https://{site.custom_domain}{clean_subpath}/{blog.slug}"

    return f"{_ugc_subdomain(site)}{clean_subpath}/{blog.slug}"
