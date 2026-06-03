"""HTML sanitization utility for user-generated content.

Uses nh3 (Ammonia) to sanitize HTML and enforce safe content policies:
- Restricted HTML tags/attributes whitelist
- Safe link handling with rel="nofollow ugc"
- Blocked dangerous URL schemes (javascript:, data:text/html, vbscript:)
"""

import nh3
from urllib.parse import urlparse


# Allowed HTML tags for rich content editing
ALLOWED_TAGS = {
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "del",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "code",
    "pre",
    "hr",
    "div",
    "span",
    "mark",
    "sub",
    "sup",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "iframe",
}

# Allowed attributes per tag
# Note: 'rel' is NOT included for 'a' tags because link_rel parameter handles it
ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height"},
    "iframe": {"src", "frameborder", "allowfullscreen", "allow", "title", "width", "height", "referrerpolicy"},
    "div": {"data-youtube-video", "style"},
    "mark": {"style"},
    "*": {"class"},
}

# URL schemes allowed in href/src attributes
ALLOWED_URL_SCHEMES = {"http", "https", "mailto", "tel"}

# Link rel attribute to enforce for external links
LINK_REL_VALUE = "nofollow ugc"


def _url_filter(url: str) -> str | None:
    """Filter URLs to block dangerous schemes.

    Returns the URL if safe, None if it should be removed.
    """
    if not url:
        return None

    # Parse the URL to check the scheme
    parsed = urlparse(url)
    scheme = parsed.scheme.lower() if parsed.scheme else ""

    # Block dangerous schemes
    dangerous_schemes = {"javascript", "data", "vbscript", "file", "ftp"}
    if scheme in dangerous_schemes:
        return None

    # Allow if no scheme (relative URL) or scheme is in allowed list
    if not scheme or scheme in ALLOWED_URL_SCHEMES:
        return url

    # Block any other schemes
    return None


def _link_rel_callback(tag: str, name: str, value: str) -> str | None:
    """Callback to enforce rel='nofollow ugc' on links.

    For anchor tags, always set rel to 'nofollow ugc' regardless of input.
    """
    if tag == "a" and name == "rel":
        return LINK_REL_VALUE
    return value


def _attribute_filter(tag: str, name: str, value: str) -> str | None:
    """Filter HTML attributes based on tag and allowed attributes.

    Returns the value if allowed, None to remove the attribute.
    """
    # Check if attribute is allowed for this tag
    allowed_for_tag = ALLOWED_ATTRIBUTES.get(tag, set())
    global_allowed = ALLOWED_ATTRIBUTES.get("*", set())

    if name not in allowed_for_tag and name not in global_allowed:
        return None

    # Special handling for href attributes
    if name == "href":
        return _url_filter(value)

    # Special handling for src attributes (images)
    if name == "src":
        # Allow data URIs for images (common for base64 encoded images)
        if value.startswith("data:image/"):
            return value
        return _url_filter(value)

    # Enforce rel attribute on links
    if tag == "a" and name == "rel":
        return LINK_REL_VALUE

    return value


def sanitize_html(content: str | None) -> str:
    """Sanitize HTML content for safe storage and rendering.

    This function:
    - Strips disallowed HTML tags
    - Filters attributes to only allowed ones
    - Blocks dangerous URL schemes (javascript:, data:, etc.)
    - Enforces rel="nofollow ugc" on all links

    Args:
        content: Raw HTML content to sanitize

    Returns:
        Sanitized HTML string safe for storage and display
    """
    if not content or not isinstance(content, str):
        return ""

    content = content.strip()
    if not content:
        return ""

    # Use nh3 to clean the HTML with our policies
    cleaned = nh3.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes=ALLOWED_URL_SCHEMES,
        link_rel=LINK_REL_VALUE,
    )

    return cleaned


def is_safe_url(url: str) -> bool:
    """Check if a URL is safe (doesn't use dangerous schemes).

    Args:
        url: URL to check

    Returns:
        True if the URL is safe, False otherwise
    """
    return _url_filter(url) is not None
