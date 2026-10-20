"""Normalization helpers for user-supplied SEO text (robots.txt / llms.txt).

RFC 9309 (Robots Exclusion Protocol) requires the file to be UTF-8 and to
exclude control characters, and tells parsers to treat the content as
untrusted. These helpers keep user-provided SEO text within those bounds so
the raw text is safe to store and serve verbatim with a text/* content type.
"""

import re

# Control characters except LF (\\n) and TAB (\\t), plus DEL (\\x7f).
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def normalize_seo_text(value: str | None) -> str | None:
    """Strip control characters and normalize line endings.

    - Removes control characters other than LF/TAB (RFC 9309 UTF8-char-noctl).
    - Normalizes CRLF and lone CR to LF.
    - Returns None for falsy input so empty custom text stays unset.
    """
    if not value:
        return None

    text = _CONTROL_CHARS_RE.sub("", value)
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    if not text.strip():
        return None

    return text