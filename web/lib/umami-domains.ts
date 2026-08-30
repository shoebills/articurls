import { MARKETING_ORIGIN, UGC_ORIGIN } from "@/lib/env";
import { hasActiveCustomDomain } from "@/lib/custom-domain-redirect";
import type { PublicSite } from "@/lib/types";

function addHost(domains: Set<string>, hostname: string): void {
  const host = hostname.toLowerCase().trim();
  if (!host) return;
  domains.add(host);
  if (!host.startsWith("www.")) {
    domains.add(`www.${host}`);
  }
}

/** Comma-separated hostnames for Umami data-domains (must be non-empty). */
export function buildUmamiDomains(site: PublicSite): string {
  const domains = new Set<string>();

  try {
    addHost(domains, new URL(MARKETING_ORIGIN).hostname);
    addHost(domains, new URL(UGC_ORIGIN).hostname);
  } catch {
    return "";
  }

  if (hasActiveCustomDomain(site) && site.custom_domain) {
    addHost(domains, site.custom_domain);
  }

  return [...domains].join(",");
}
