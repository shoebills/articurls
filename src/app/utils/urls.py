from sqlalchemy.orm import Session

from .. import models
from ..config import settings


def public_post_url(user: models.User, blog: models.Blog, _db: Session) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/{user.user_name}/blog/{blog.slug}"
