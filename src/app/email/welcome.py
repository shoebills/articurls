import re
from pathlib import Path

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
    cleaned = re.sub(
        r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned


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
        html = _apply_placeholders(custom_body_html.strip(), blog_name, blog_url, unsubscribe_url)
        if "unsubscribe" not in html.lower():
            html += (
                '<p style="font-size:12px;color:#999999;margin-top:24px;text-align:center;">'
                f'<a href="{unsubscribe_url}">Unsubscribe</a></p>'
            )
    else:
        html = (TEMPLATE_DIR / "welcome_email.html").read_text()
        html = _apply_placeholders(html, blog_name, blog_url, unsubscribe_url)

    return subject, html
