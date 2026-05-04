/**
 * Domain resolution helpers for SEO (sitemap / robots.txt).
 *
 * The lookup logic mirrors the custom-domain page's `resolveDomainInfo` —
 * kept in one place so sitemap and robots routes share the same behaviour.
 */

import { API_URL } from "@/lib/env";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DomainLookupResult {
  username: string;
  domain_status: string;
  custom_domain: string | null;
}

// ── Platform hosts (not user custom domains) ─────────────────────────────────

const PLATFORM_HOSTS = new Set([
  "articurls.com",
  "app.articurls.com",
  "api.articurls.com",
  "blogs.articurls.com",
  "fallback.articurls.com",
]);

/**
 * Returns `true` when `host` is a user-owned custom domain
 * (i.e. NOT one of the platform's own subdomains).
 */
export function isCustomDomain(host: string): boolean {
  return !PLATFORM_HOSTS.has(host.toLowerCase());
}

// ── Domain resolver ──────────────────────────────────────────────────────────

/**
 * Resolve a hostname to the owning user and domain status via the
 * internal domain-lookup endpoint.
 *
 * Returns `null` when the host is unknown (404) or on any network error,
 * matching the behaviour of the custom-domain page.
 */
export async function resolveDomainForSeo(
  host: string
): Promise<DomainLookupResult | null> {
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        cache: "no-store",
        headers: {
          "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
        },
      }
    );

    if (!res.ok) return null;

    const data: { username: string; domain_status: string } = await res.json();

    return {
      username: data.username,
      domain_status: data.domain_status,
      custom_domain: host,
    };
  } catch {
    return null;
  }
}
