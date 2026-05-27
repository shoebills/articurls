import DOMPurify from "dompurify";

// Match backend nh3 sanitizer configuration
const ALLOWED_TAGS = [
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
  "sub",
  "sup",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const ALLOWED_ATTR = [
  "href",
  "title",
  "target",
  "src",
  "alt",
  "width",
  "height",
  "class",
];

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";

  if (typeof window === "undefined") {
    return dirty;
  }

  const sanitized = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  // Add native lazy loading and async decoding for performance
  return sanitized.replace(
    /<img\b([^>]*)>/gi,
    (match, attrs) => {
      // Only add if not already present
      const hasLoading = /\sloading\s*=/.test(attrs);
      const hasDecoding = /\sdecoding\s*=/.test(attrs);

      let result = match;
      if (!hasLoading) {
        result = result.replace(/>$/, ' loading="lazy">');
      }
      if (!hasDecoding) {
        result = result.replace(/>$/, ' decoding="async">');
      }
      return result;
    }
  );
}
