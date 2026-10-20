/**
 * Domain resolution helper shared by the tenant publication page, its layout,
 * and the tenant SEO/feed route handlers (sitemap / robots.txt / llms.txt).
 */

import { API_URL } from "@/lib/env";

export interface DomainLookupResult {
  subdomain: string;
  domain_status: string;
  custom_domain: string | null;
  redirect_to: string | null;
  custom_subpath?: string | null;
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
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        next: {
          revalidate: 86400,
          tags: [`domain-${host}`, "domains"],
        },
        headers: {
          "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
        },
      }
    );

    if (!res.ok) return null;

    const data: {
      subdomain: string;
      domain_status: string;
      redirect_to?: string | null;
      custom_subpath?: string | null;
    } = await res.json();

    return {
      subdomain: data.subdomain,
      domain_status: data.domain_status,
      custom_domain: host,
      redirect_to: data.redirect_to ?? null,
      custom_subpath: data.custom_subpath ?? null,
    };
  } catch {
    return null;
  }
}
