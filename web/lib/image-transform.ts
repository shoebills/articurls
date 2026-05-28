/**
 * Cloudflare Image Transformation utilities
 * Transforms R2 image URLs to use Cloudflare Image Transformations
 * Format: https://images.articurls.com/cdn-cgi/image/{options}/{path}
 */

interface TransformOptions {
  width?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "jpeg" | "png";
  fit?: "contain" | "cover" | "scale-down" | "fill";
}

const DEFAULT_OPTIONS: TransformOptions = {
  width: 600,
  quality: 85,
  format: "auto",
  fit: "contain",
};

/**
 * Transform an image URL to use Cloudflare Image Transformations
 * Only transforms if the URL is from our R2 custom domain
 */
export function transformImageUrl(
  originalUrl: string,
  options: TransformOptions = {}
): string {
  if (!originalUrl) return "";

  // Skip if already transformed
  if (originalUrl.includes("/cdn-cgi/image/")) {
    return originalUrl;
  }

  // Only transform R2 URLs (both old pub-xxx.r2.dev and new images.articurls.com)
  const isR2Url =
    originalUrl.includes("r2.dev") ||
    originalUrl.includes("images.articurls.com");

  if (!isR2Url) {
    return originalUrl;
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    const url = new URL(originalUrl);

    // If it's already the new custom domain, transform it
    if (url.hostname === "images.articurls.com") {
      const transforms = [
        `format=${mergedOptions.format}`,
        `width=${mergedOptions.width}`,
        `quality=${mergedOptions.quality}`,
        `fit=${mergedOptions.fit}`,
      ].join(",");

      return `https://images.articurls.com/cdn-cgi/image/${transforms}${url.pathname}`;
    }

    // If it's the old pub-xxx.r2.dev, we need to convert to new domain
    if (url.hostname.includes("r2.dev")) {
      const transforms = [
        `format=${mergedOptions.format}`,
        `width=${mergedOptions.width}`,
        `quality=${mergedOptions.quality}`,
        `fit=${mergedOptions.fit}`,
      ].join(",");

      // Map old URL to new custom domain
      return `https://images.articurls.com/cdn-cgi/image/${transforms}${url.pathname}`;
    }

    return originalUrl;
  } catch {
    // If URL parsing fails, return original
    return originalUrl;
  }
}

/**
 * Generate srcset for responsive images
 * Returns string suitable for img srcset attribute
 */
export function generateSrcSet(
  originalUrl: string,
  sizes: number[] = [400, 800, 1200]
): string {
  if (!originalUrl) return "";

  const isR2Url =
    originalUrl.includes("r2.dev") ||
    originalUrl.includes("images.articurls.com");

  if (!isR2Url) {
    return originalUrl;
  }

  return sizes
    .map((width) => `${transformImageUrl(originalUrl, { width })} ${width}w`)
    .join(", ");
}

/**
 * Generate sizes attribute for responsive images
 * Based on common blog layouts
 */
export function generateSizes(
  mobileWidth: string = "100vw",
  desktopWidth: string = "600px"
): string {
  return `(max-width: 768px) ${mobileWidth}, ${desktopWidth}`;
}

/**
 * Transform all image URLs in HTML content
 * Used when rendering blog content with sanitized HTML
 */
export function transformHtmlImages(
  html: string,
  options: TransformOptions = {}
): string {
  if (!html) return html;

  // Match img tags with src attributes containing R2 URLs
  return html.replace(
    /<img([^>]*)\ssrc=["'](https:\/\/[^"']*(?:r2\.dev|images\.articurls\.com)[^"']*)["']([^>]*)>/gi,
    (match, beforeSrc, imageUrl, afterSrc) => {
      const transformedUrl = transformImageUrl(imageUrl, options);

      // Generate srcset for responsive loading
      const srcset = generateSrcSet(imageUrl);

      // Add srcset and sizes if not already present
      let result = match.replace(imageUrl, transformedUrl);

      if (srcset && !match.includes("srcset=")) {
        // Insert srcset before the closing > or before existing attributes
        const sizes = generateSizes();
        result = result.replace(
          /(\s*)>$/,
          ` srcset="${srcset}" sizes="${sizes}"$1>`
        );
      }

      return result;
    }
  );
}
