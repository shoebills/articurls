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

  // Sanitize on client only (DOMPurify needs DOM)
  // On server, trust the backend already sanitized with nh3
  const html = typeof window === "undefined"
    ? dirty
    : DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
      });

  // Add native lazy loading and async decoding for performance
  // Skip first image (likely LCP) to avoid delaying hero image
  let imgCount = 0;
  return html.replace(
    /<img\b([^>]*)>/gi,
    (match, attrs) => {
      imgCount++;
      const isFirstImage = imgCount === 1;

      // Only add if not already present
      const hasLoading = /\sloading\s*=/.test(attrs);
      const hasDecoding = /\sdecoding\s*=/.test(attrs);
      const hasWidth = /\swidth\s*=/.test(attrs);
      const hasHeight = /\sheight\s*=/.test(attrs);

      let result = match;

      // Don't lazy load first image (LCP candidate)
      if (!hasLoading && !isFirstImage) {
        result = result.replace(/>$/, ' loading="lazy">');
      }

      if (!hasDecoding) {
        result = result.replace(/>$/, ' decoding="async">');
      }

      return result;
    }
  );
}
