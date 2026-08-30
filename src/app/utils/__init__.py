from .entitlements import is_pro_entitled
from .admin import assert_admin_email, is_admin_email
from .serialization import public_site_out
from .slugs import (
    DRAFT_SLUG_RE,
    maybe_replace_placeholder_page_slug_on_publish,
    maybe_replace_placeholder_slug_on_publish,
    unique_blog_slug,
    unique_page_slug,
)
from .text import (
    html_to_plain_text,
    make_excerpt,
    make_meta_description,
    materialize_content_meta_defaults,
    normalize_email,
    normalize_subdomain,
    user_by_email,
)
from .urls import public_blog_home_url, public_post_url
from .subdomains import (
    permanent_subdomain_redirect,
    resolve_subdomain_to_current,
    validate_subdomain_or_raise,
)

__all__ = [
    "DRAFT_SLUG_RE",
    "assert_admin_email",
    "is_admin_email",
    "html_to_plain_text",
    "is_pro_entitled",
    "make_excerpt",
    "make_meta_description",
    "materialize_content_meta_defaults",
    "maybe_replace_placeholder_page_slug_on_publish",
    "maybe_replace_placeholder_slug_on_publish",
    "normalize_email",
    "normalize_subdomain",
    "public_blog_home_url",
    "public_post_url",
    "public_site_out",
    "permanent_subdomain_redirect",
    "resolve_subdomain_to_current",
    "unique_blog_slug",
    "unique_page_slug",
    "validate_subdomain_or_raise",
    "user_by_email",
]
