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
 * Public content on the UGC domain (articurls.site) is indexable only for
 * Pro users who do not currently have an active/grace custom domain.
 * Custom domain users get their own sitemap/RSS on their own domain instead.
 */
export function shouldIndexOnUgcDomain(user: {
  is_pro: boolean;
  domain_status?: string | null;
}): boolean {
  const hasActiveCustomDomain = isIndexableDomainStatus(user.domain_status);
  return user.is_pro && !hasActiveCustomDomain;
}
