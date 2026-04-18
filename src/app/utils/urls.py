from sqlalchemy.orm import Session
from .. import models
from ..config import settings
from ..domains import normalize_custom_domain
from .entitlements import is_pro_entitled


def public_post_url(user: models.User, blog: models.Blog, db: Session) -> str:

    if (is_pro_entitled(user, db) and user.is_domain_verified and normalize_custom_domain(user.custom_domain)):
        host = normalize_custom_domain(user.custom_domain)
        return f"https://{host}/{blog.slug}"
    
    base = settings.public_base_url.rstrip("/")

    return f"{base}/{user.user_name}/blog/{blog.slug}"
