from __future__ import annotations
import re
from dataclasses import dataclass
from datetime import datetime
from xml.sax.saxutils import escape
from sqlalchemy.orm import Session
from . import models
from .config import settings
from .domains import normalize_custom_domain
from .utils import is_pro_entitled


@dataclass
class CanonicalContext:
    base_url: str
    profile_url: str
    blog_prefix: str
    page_prefix: str
    sitemap_url: str
    canonical_on_custom_domain: bool


def canonical_context(user: models.User, db: Session) -> CanonicalContext:
    custom = normalize_custom_domain(user.custom_domain)
    custom_live = bool(custom and user.is_domain_verified and is_pro_entitled(user, db))
    if custom_live:
        base = f"https://{custom}"
        return CanonicalContext(
            base_url=base,
            profile_url=f"{base}/",
            blog_prefix=f"{base}/",
            page_prefix=f"{base}/page/",
            sitemap_url=f"{base}/sitemap.xml",
            canonical_on_custom_domain=True,
        )

    root = settings.public_base_url.rstrip("/")
    user_root = f"{root}/{user.user_name}"
    return CanonicalContext(
        base_url=user_root,
        profile_url=user_root,
        blog_prefix=f"{user_root}/blog/",
        page_prefix=f"{user_root}/page/",
        sitemap_url=f"{user_root}/sitemap.xml",
        canonical_on_custom_domain=False,
    )


def render_robots(
    user: models.User,
    db: Session,
    force_disallow: bool = False,
    serving_custom_host: bool = False,
) -> str:
    ctx = canonical_context(user, db)
    mode = (user.robots_mode or "auto").strip().lower()
    lines = ["User-agent: *"]

    auto_disallow = mode == "auto" and (
        (ctx.canonical_on_custom_domain and not serving_custom_host)
        or ((not ctx.canonical_on_custom_domain) and serving_custom_host)
    )

    if force_disallow or mode == "off" or auto_disallow:
        lines.append("Disallow: /")
    else:
        lines.append("Allow: /")

    if mode == "custom" and user.robots_custom_rules:
        lines.append("")
        lines.append(_sanitize_custom_robots_rules(user.robots_custom_rules))

    if user.sitemap_enabled:
        lines.append("")
        lines.append(f"Sitemap: {ctx.sitemap_url}")

    return "\n".join(lines).strip() + "\n"


def _fmt_lastmod(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.date().isoformat()


def render_sitemap(user: models.User, db: Session) -> str:
    if not user.sitemap_enabled:
        return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'

    ctx = canonical_context(user, db)
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "  <url>",
        f"    <loc>{escape(ctx.profile_url)}</loc>",
        "  </url>",
    ]

    blogs = (
        db.query(models.Blog)
        .filter(models.Blog.user_id == user.user_id, models.Blog.status == models.BlogStatus.PUBLISHED)
        .order_by(models.Blog.published_at.desc(), models.Blog.updated_at.desc())
        .all()
    )
    for b in blogs:
        parts.append("  <url>")
        parts.append(f"    <loc>{escape(ctx.blog_prefix + b.slug)}</loc>")
        lastmod = _fmt_lastmod(b.published_at or b.updated_at)
        if lastmod:
            parts.append(f"    <lastmod>{lastmod}</lastmod>")
        parts.append("  </url>")

    pages = db.query(models.UserPage).filter(models.UserPage.user_id == user.user_id).all()
    for p in pages:
        parts.append("  <url>")
        parts.append(f"    <loc>{escape(ctx.page_prefix + p.slug)}</loc>")
        lastmod = _fmt_lastmod(p.updated_at)
        if lastmod:
            parts.append(f"    <lastmod>{lastmod}</lastmod>")
        parts.append("  </url>")

    parts.append("</urlset>")
    return "\n".join(parts)


def render_platform_sitemap(db: Session) -> str:
    root = settings.public_base_url.rstrip("/")
    parts: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    users = db.query(models.User).all()
    for u in users:
        ctx = canonical_context(u, db)
        if ctx.canonical_on_custom_domain:
            continue
        if not bool(u.sitemap_enabled):
            continue
        if (u.robots_mode or "auto").strip().lower() == "off":
            continue
        profile = f"{root}/{u.user_name}"
        parts.append("  <url>")
        parts.append(f"    <loc>{escape(profile)}</loc>")
        parts.append("  </url>")

        blogs = (
            db.query(models.Blog)
            .filter(models.Blog.user_id == u.user_id, models.Blog.status == models.BlogStatus.PUBLISHED)
            .all()
        )
        for b in blogs:
            parts.append("  <url>")
            parts.append(f"    <loc>{escape(f'{profile}/blog/{b.slug}')}</loc>")
            lastmod = _fmt_lastmod(b.published_at or b.updated_at)
            if lastmod:
                parts.append(f"    <lastmod>{lastmod}</lastmod>")
            parts.append("  </url>")

        pages = db.query(models.UserPage).filter(models.UserPage.user_id == u.user_id).all()
        for p in pages:
            parts.append("  <url>")
            parts.append(f"    <loc>{escape(f'{profile}/page/{p.slug}')}</loc>")
            lastmod = _fmt_lastmod(p.updated_at)
            if lastmod:
                parts.append(f"    <lastmod>{lastmod}</lastmod>")
            parts.append("  </url>")

    parts.append("</urlset>")
    return "\n".join(parts)


_ROBOTS_DIRECTIVE_RE = re.compile(r"^(user-agent|allow|disallow|crawl-delay|host)\s*:", re.IGNORECASE)


def _sanitize_custom_robots_rules(raw: str) -> str:
    safe_lines: list[str] = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            safe_lines.append("")
            continue
        if stripped.startswith("#"):
            safe_lines.append(stripped)
            continue
        if _ROBOTS_DIRECTIVE_RE.match(stripped):
            safe_lines.append(stripped)
    return "\n".join(safe_lines).strip()
