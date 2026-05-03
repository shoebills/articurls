from sqlalchemy.orm import Session

from .. import models
from ..config import settings


def public_post_url(user: models.User, blog: models.Blog, _db: Session) -> str:
    # Use custom domain if active or in grace period
    if (
        user.custom_domain
        and user.domain_status in (models.DomainStatus.ACTIVE, models.DomainStatus.GRACE)
    ):
        return f"https://{user.custom_domain}/blog/{blog.slug}"

    base = settings.marketing_origin.rstrip("/")
    return f"{base}/{user.user_name}/blog/{blog.slug}"
