from sqlalchemy.orm import Session

from .. import models
from ..config import settings


def public_post_url(user: models.User, blog: models.Blog, _db: Session) -> str:
    # Use custom domain if active or in grace period.
    # Compare as strings to handle both enum and plain-string column values.
    domain_status = str(user.domain_status.value if hasattr(user.domain_status, 'value') else user.domain_status)
    if (
        user.custom_domain
        and domain_status in ("active", "grace")
    ):
        return f"https://{user.custom_domain}/blog/{blog.slug}"

    base = settings.marketing_origin.rstrip("/")
    return f"{base}/{user.user_name}/blog/{blog.slug}"
