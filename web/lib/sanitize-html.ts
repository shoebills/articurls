import DOMPurify from "dompurify";
import { transformImageUrl, generateSrcSet, generateSizes } from "./image-transform";

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
  "id",
  "srcset",
  "sizes",
  "loading",
  "decoding",
  "fetchpriority",
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

  // Transform R2 image URLs to use Cloudflare Image Transformations
  // and add lazy loading attributes
  let imgCount = 0;
  return html.replace(
    /<img\b([^>]*)>/gi,
    (match: string, attrs: string) => {
      imgCount++;
      const isFirstImage = imgCount === 1;

      // Extract src URL
      const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/);
      const originalSrc = srcMatch ? srcMatch[1] : "";

      // Transform src if it's an R2 image - use 600px for mobile LCP optimization
      let result = match;
      if (originalSrc) {
        const transformedSrc = transformImageUrl(originalSrc, { width: 600 });
        if (transformedSrc !== originalSrc) {
          result = result.replace(originalSrc, transformedSrc);
        }
      }

      // Check for existing attributes
      const hasLoading = /\sloading\s*=/.test(attrs);
      const hasDecoding = /\sdecoding\s*=/.test(attrs);
      const hasFetchpriority = /\sfetchpriority\s*=/.test(attrs);
      const hasSrcset = /\ssrcset\s*=/.test(attrs);

      // Extract data-srcset and data-sizes if present
      const dataSrcsetMatch = attrs.match(/\bdata-srcset=["']([^"']+)["']/);
      const dataSizesMatch = attrs.match(/\bdata-sizes=["']([^"']+)["']/);

      // Add srcset/sizes from data attributes or generate new ones
      if (!hasSrcset && originalSrc) {
        const srcset = dataSrcsetMatch
          ? dataSrcsetMatch[1]
          : generateSrcSet(originalSrc);
        const sizes = dataSizesMatch ? dataSizesMatch[1] : generateSizes();
        result = result.replace(/>$/, ` srcset="${srcset}" sizes="${sizes}">`);
      }

      // Don't lazy load first image (LCP candidate)
      if (!hasLoading && !isFirstImage) {
        result = result.replace(/>$/, ' loading="lazy">');
      }

      // Don't async-decode first image either (LCP should decode sync)
      if (!hasDecoding && !isFirstImage) {
        result = result.replace(/>$/, ' decoding="async">');
      }

      // Add fetchpriority=high to first image (LCP) for faster loading
      if (!hasFetchpriority && isFirstImage) {
        result = result.replace(/>$/, ' fetchpriority="high">');
      }

      return result;
    }
  );
}
