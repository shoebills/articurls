/**
 * Shared SEO helpers for sitemap and robots.txt generation.
 */

const INDEXABLE_STATUSES = new Set(["active", "grace"]);

/**
 * Returns true if the domain status allows the domain to be indexed
 * by search engines (i.e. included in sitemaps / not disallowed in robots.txt).
 */
export function isIndexableDomainStatus(
  status: string | null | undefined
): boolean {
  return typeof status === "string" && INDEXABLE_STATUSES.has(status);
}

/**
 * Builds a canonical base URL from a hostname.
 * Always returns `https://<host>` with no trailing slash.
 */
export function buildBaseUrl(host: string): string {
  return `https://${host}`;
}

/**
 * Determines whether a user's blog should be included in sitemap output.
 * Defaults to true; only returns false when explicitly disabled.
 */
export function shouldIncludeInSitemap(user: {
  sitemap_enabled?: boolean | null;
}): boolean {
  return user.sitemap_enabled !== false;
}
