import type { PublicUser } from "@/lib/types";

/**
 * Check whether a user has a working custom domain.
 *
 * Returns true for both "active" and "grace" statuses:
 * • "active" → domain is live, SSL is good, everything works.
 * • "grace"  → Pro subscription lapsed but domain is still fully
 *   serving during the 30-day grace window. Treat identically to
 *   active so links, canonicals, and redirects stay consistent.
 * • "pending"/"expired"/"none" → no usable custom domain.
 */
export function hasActiveCustomDomain(user: PublicUser): boolean {
  return !!(
    user.custom_domain &&
    (user.domain_status === "active" || user.domain_status === "grace")
  );
}

/**
 * Build the full custom domain URL for a given path.
 *
 * @param customDomain  The verified hostname, e.g. "blog.example.com"
 * @param path          Path segment WITHOUT the /{username} prefix.
 *                      Examples: "/blog/my-post", "/category/tech", "/"
 */
export function buildCustomDomainUrl(
  customDomain: string,
  path: string = "/",
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${customDomain}${normalizedPath === "/" ? "" : normalizedPath}`;
}

/**
 * Resolve the canonical URL for a public page.
 *
 * If the user has an active custom domain, the canonical points there
 * so that Google consolidates all ranking signals on the custom domain.
 * Otherwise it falls back to the articurls.com marketing URL.
 *
 * @param user               Public user object (includes domain info)
 * @param marketingOrigin    e.g. "https://articurls.com"
 * @param marketingPath      Full path on the marketing domain,
 *                           e.g. "/johndoe/blog/my-post"
 * @param customDomainPath   Path on the custom domain (no username prefix),
 *                           e.g. "/blog/my-post"
 */
export function resolveCanonicalUrl(
  user: PublicUser,
  marketingOrigin: string,
  marketingPath: string,
  customDomainPath: string,
): string {
  if (hasActiveCustomDomain(user)) {
    return buildCustomDomainUrl(user.custom_domain!, customDomainPath);
  }
  return `${marketingOrigin}${marketingPath}`;
}

/**
 * If the user has an active custom domain, return the URL to redirect to.
 * Returns null if no redirect is needed.
 *
 * Used by page components to issue a 301 permanent redirect from the
 * articurls.com path to the custom domain — the strongest SEO signal
 * for domain consolidation.
 */
export function getCustomDomainRedirectUrl(
  user: PublicUser,
  customDomainPath: string,
): string | null {
  if (!hasActiveCustomDomain(user)) return null;
  return buildCustomDomainUrl(user.custom_domain!, customDomainPath);
}
