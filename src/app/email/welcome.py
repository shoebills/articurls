import re
from html import escape
from pathlib import Path
from ..utils.html_sanitizer import sanitize_html

TEMPLATE_DIR = Path(__file__).parent
DEFAULT_SUBJECT = "Welcome to {{ blog_name }}'s blog"

MAX_SUBJECT_LEN = 200
MAX_BODY_LEN = 50_000
MAX_DELAY_MINUTES = 10_080  # 7 days

def sanitize_welcome_subject(subject: str | None) -> str | None:
    if subject is None:
        return None
    cleaned = subject.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_SUBJECT_LEN:
        raise ValueError(f"Subject must be {MAX_SUBJECT_LEN} characters or fewer")
    return cleaned


def sanitize_welcome_body(html: str | None) -> str | None:
    if html is None:
        return None
    cleaned = html.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_BODY_LEN:
        raise ValueError(f"Body must be {MAX_BODY_LEN} characters or fewer")
    # Use nh3-based sanitizer for consistent, robust HTML cleaning
    return sanitize_html(cleaned)


def validate_delay_minutes(delay: int) -> int:
    if delay < 0 or delay > MAX_DELAY_MINUTES:
        raise ValueError(f"Delay must be between 0 and {MAX_DELAY_MINUTES} minutes")
    return delay


def _apply_placeholders(text: str, blog_name: str, blog_url: str, unsubscribe_url: str) -> str:
    replacements = {
        "{{ blog_name }}": blog_name,
        "{{blog_name}}": blog_name,
        "{{ blog_url }}": blog_url,
        "{{blog_url}}": blog_url,
        "{{ unsubscribe_url }}": unsubscribe_url,
        "{{unsubscribe_url}}": unsubscribe_url,
    }
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text


def normalize_body_fragment(html: str) -> str:
    """Turn stored/editor HTML into a safe inner fragment for the email shell."""
    text = html.strip()
    if not text:
        return ""

    lower = text.lower()
    if "<html" in lower or "<body" in lower:
        body_match = re.search(r"<body[^>]*>(.*)</body>", text, flags=re.IGNORECASE | re.DOTALL)
        if body_match:
            text = body_match.group(1).strip()
        else:
            text = re.sub(r"<!DOCTYPE[^>]*>", "", text, flags=re.IGNORECASE)
            text = re.sub(r"</?html[^>]*>", "", text, flags=re.IGNORECASE)
            text = re.sub(r"<head[^>]*>.*?</head>", "", text, flags=re.IGNORECASE | re.DOTALL)
            text = re.sub(r"</?body[^>]*>", "", text, flags=re.IGNORECASE)

    if "<" not in text:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        if not paragraphs:
            paragraphs = [text]
        return "".join(
            f'<p style="margin:0 0 16px;font-size:16px;color:#555555;line-height:1.6;">{escape(p)}</p>'
            for p in paragraphs
        )

    return sanitize_html(text)


def inline_fragment_styles(fragment: str) -> str:
    """Add email-client-friendly inline styles to common tags when missing."""

    def style_tag(tag: str, default_style: str, html: str) -> str:
        pattern = rf"<{tag}(?![^>]*\bstyle=)([^>]*)>"
        return re.sub(
            pattern,
            rf'<{tag} style="{default_style}"\1>',
            html,
            flags=re.IGNORECASE,
        )

    out = fragment
    out = style_tag("h2", "margin:0 0 20px;font-size:28px;font-weight:bold;color:#111111;line-height:1.3;", out)
    out = style_tag("h3", "margin:0 0 16px;font-size:22px;font-weight:bold;color:#111111;line-height:1.3;", out)
    out = style_tag("p", "margin:0 0 16px;font-size:16px;color:#555555;line-height:1.6;", out)
    out = style_tag(
        "ul",
        "margin:0 0 16px;padding-left:24px;list-style-type:disc;font-size:16px;color:#555555;line-height:1.6;",
        out,
    )
    out = style_tag(
        "ol",
        "margin:0 0 16px;padding-left:24px;list-style-type:decimal;font-size:16px;color:#555555;line-height:1.6;",
        out,
    )
    out = style_tag(
        "li",
        "margin:0 0 8px;display:list-item;font-size:16px;color:#555555;line-height:1.6;",
        out,
    )

    button_style = (
        "display:inline-block;padding:10.5px 21px;background:#111111;color:#ffffff;"
        "text-decoration:none;font-size:14px;border-radius:4px;"
    )
    out = re.sub(
        r'<a(?![^>]*\bstyle=)([^>]*data-email-button[^>]*)>',
        rf'<a style="{button_style}"\1>',
        out,
        flags=re.IGNORECASE,
    )
    out = re.sub(
        r'<p(?![^>]*\bstyle=)([^>]*data-email-button-wrap[^>]*)>',
        r'<p style="margin:0;padding-bottom:35px;"\1>',
        out,
        flags=re.IGNORECASE,
    )
    return out


def _load_shell() -> str:
    return (TEMPLATE_DIR / "welcome_email_shell.html").read_text()


def _load_default_body() -> str:
    return (TEMPLATE_DIR / "welcome_email_default_body.html").read_text()


def assemble_welcome_html(
    *,
    body_fragment: str,
    blog_name: str,
    blog_url: str,
    unsubscribe_url: str,
) -> str:
    normalized = inline_fragment_styles(normalize_body_fragment(body_fragment))
    normalized = _apply_placeholders(normalized, blog_name, blog_url, unsubscribe_url)
    shell = _load_shell()
    shell = shell.replace("{{ body_content }}", normalized)
    shell = _apply_placeholders(shell, blog_name, blog_url, unsubscribe_url)
    return shell


def render_welcome_email(
    *,
    blog_name: str,
    blog_url: str,
    unsubscribe_url: str,
    custom_subject: str | None,
    custom_body_html: str | None,
) -> tuple[str, str]:
    subject_template = (custom_subject or "").strip() or DEFAULT_SUBJECT
    subject = _apply_placeholders(subject_template, blog_name, blog_url, unsubscribe_url)

    if custom_body_html and custom_body_html.strip():
        body_fragment = custom_body_html.strip()
    else:
        body_fragment = _load_default_body()

    html = assemble_welcome_html(
        body_fragment=body_fragment,
        blog_name=blog_name,
        blog_url=blog_url,
        unsubscribe_url=unsubscribe_url,
    )
    return subject, html
