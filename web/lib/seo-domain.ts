/**
 * Domain resolution helpers for SEO (sitemap / robots.txt).
 *
 * The lookup logic mirrors the custom-domain page's `resolveDomainInfo` —
 * kept in one place so sitemap and robots routes share the same behaviour.
 */

import { API_URL, UGC_DOMAIN } from "@/lib/env";
import { isCustomDomainHost, buildRuntimeHostsFromEnv } from "@/lib/request-host";

export interface DomainLookupResult {
  username: string;
  domain_status: string;
  custom_domain: string | null;
  redirect_to: string | null;
}

/** True when host is a customer domain, not articurls platform infrastructure. */
export function isCustomDomain(host: string): boolean {
  return isCustomDomainHost(host, buildRuntimeHostsFromEnv());
}

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
  const RESERVED = new Set(["www", "app", "api", "admin", "mail", "support"]);
  if (host.endsWith(`.${UGC_DOMAIN}`)) {
    const subdomain = host.split(".")[0];
    if (subdomain && !RESERVED.has(subdomain)) {
      return { username: subdomain, domain_status: "active", custom_domain: host, redirect_to: null };
    }
  }
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

    const data: {
      username: string;
      domain_status: string;
      redirect_to?: string | null;
    } = await res.json();

    return {
      username: data.username,
      domain_status: data.domain_status,
      custom_domain: host,
      redirect_to: data.redirect_to ?? null,
    };
  } catch {
    return null;
  }
}
