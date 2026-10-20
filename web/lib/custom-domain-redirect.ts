import type { PublicSite } from "@/lib/types";

/**
 * Check whether a site has a working custom domain.
 *
 * Returns true for both "active" and "grace" statuses:
 * • "active" → domain is live, SSL is good, everything works.
 * • "grace"  → Pro subscription lapsed but domain is still fully
 *   serving during the grace window. Treat identically to active so
 *   links, canonicals, and redirects stay consistent.
 * • "pending"/"expired"/"none" → no usable custom domain.
 */
export function hasActiveCustomDomain(site: PublicSite): boolean {
  return !!(
    site.custom_domain &&
    (site.domain_status === "active" || site.domain_status === "grace")
  );
}