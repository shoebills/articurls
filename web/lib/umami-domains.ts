import { MARKETING_ORIGIN, UGC_ORIGIN } from "@/lib/env";
import { hasActiveCustomDomain } from "@/lib/custom-domain-redirect";
import type { PublicSite } from "@/lib/types";

function addHost(domains: Set<string>, hostname: string): void {
  const host = hostname.toLowerCase().trim().replace(/^\.+|\.+$/g, "");
  if (!host) return;
  const bare = host.startsWith("www.") ? host.slice(4) : host;
  if (!bare) return;
  domains.add(bare);
  domains.add(`www.${bare}`);
}

/** Comma-separated hostnames for Umami data-domains (must be non-empty). */
export function buildUmamiDomains(site: PublicSite): string {
  const domains = new Set<string>();

  try {
    addHost(domains, new URL(MARKETING_ORIGIN).hostname);
    const ugcHost = new URL(UGC_ORIGIN).hostname.toLowerCase().trim();
    addHost(domains, ugcHost);
    if (site.subdomain && ugcHost) {
      domains.add(`${site.subdomain.toLowerCase().trim()}.${ugcHost}`);
    }
  } catch {
    return "";
  }

  if (hasActiveCustomDomain(site) && site.custom_domain) {
    addHost(domains, site.custom_domain);
  }

  return [...domains].join(",");
}
