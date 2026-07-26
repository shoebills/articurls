from urllib.parse import urlparse

from sqlalchemy.orm import Session

from .. import models
from ..config import settings


def _ugc_subdomain(user: models.User) -> str:
    parsed = urlparse(settings.ugc_origin)
    port = f":{parsed.port}" if parsed.port else ""
    return f"{parsed.scheme}://{user.user_name}.{parsed.hostname}{port}"


def public_blog_home_url(user: models.User) -> str:
    domain_status = str(
        user.domain_status.value if hasattr(user.domain_status, "value") else user.domain_status
    )
    if user.custom_domain and domain_status in ("active", "grace"):
        return f"https://{user.custom_domain}/"

    return f"{_ugc_subdomain(user)}/"


def public_post_url(user: models.User, blog: models.Blog, _db: Session) -> str:
    domain_status = str(user.domain_status.value if hasattr(user.domain_status, 'value') else user.domain_status)
    if (
        user.custom_domain
        and domain_status in ("active", "grace")
    ):
        return f"https://{user.custom_domain}/blog/{blog.slug}"

    return f"{_ugc_subdomain(user)}/blog/{blog.slug}"
