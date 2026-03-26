def make_excerpt(text: str, max_len: int = 160) -> str:
    if not text:
        return ""
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."

import re

def make_seo_description(content: str, max_len: int = 160) -> str:
    if not content:
        return ""

    text = " ".join(content.split())

    text = re.sub(r"\s+", " ", text).strip()

    if len(text) <= max_len:
        return text

    cut = text[: max_len + 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]

    return cut.rstrip() + "..."