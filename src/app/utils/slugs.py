import re

from slugify import slugify
from sqlalchemy.orm import Session

from .. import models


DRAFT_SLUG_RE = re.compile(r"^draft-[a-f0-9]{12}$")


def unique_blog_slug(db: Session, user_id: int, base_slug: str, exclude_blog_id: int | None = None) -> str:

    candidate = base_slug
    counter = 1

    while True:
        q = db.query(models.Blog).filter(models.Blog.user_id == user_id, models.Blog.slug == candidate)

        if exclude_blog_id is not None:
            q = q.filter(models.Blog.blog_id != exclude_blog_id)
        if q.first() is None:
            return candidate
        
        candidate = f"{base_slug}-{counter}"
        counter += 1


def maybe_replace_placeholder_slug_on_publish(db: Session, blog: models.Blog) -> None:
    # Only change slugs that look like draft-abc123...
    if not DRAFT_SLUG_RE.match(blog.slug):
        return

    # Build a slug from the title, or fall back to "post".
    if blog.title and blog.title.strip():
        base = slugify(blog.title.strip())
    else:
        base = ""

    if base == "":
        base = "post"

    blog.slug = unique_blog_slug(db, blog.user_id, base, exclude_blog_id=blog.blog_id)
