import html
import re

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models


def normalize_email(email: str | None) -> str:
    if email is None:
        return ""
    return str(email).strip().lower()


def normalize_username(user_name: str | None) -> str:
    if user_name is None:
        return ""
    return str(user_name).strip().lower()


def user_by_email(db: Session, email: str) -> models.User | None:
    norm = normalize_email(email)
    if not norm:
        return None
    return db.query(models.User).filter(func.lower(models.User.email) == norm).first()


def user_by_username(db: Session, user_name: str) -> models.User | None:
    norm = normalize_username(user_name)
    if not norm:
        return None
    return db.query(models.User).filter(func.lower(models.User.user_name) == norm).first()


HTML_TAG_RE = re.compile(r"<[^>]+>")


def html_to_plain_text(s: str) -> str:
    if not s:
        return ""
    t = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", s, flags=re.IGNORECASE)
    t = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", t, flags=re.IGNORECASE)
    t = HTML_TAG_RE.sub(" ", t)
    t = html.unescape(t)
    return " ".join(t.split())


def make_excerpt(text: str, max_len: int = 160) -> str:
    if not text:
        return ""
    cleaned = html_to_plain_text(text)
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."


def make_meta_description(content: str, max_len: int = 160) -> str:
    if not content:
        return ""

    text = html_to_plain_text(content)

    if len(text) <= max_len:
        return text

    cut = text[: max_len]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]

    return cut.rstrip() + "..."
