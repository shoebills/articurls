import { MARKETING_ORIGIN, UGS_ORIGIN } from "@/lib/env";
import { hasActiveCustomDomain } from "@/lib/custom-domain-redirect";
import type { PublicUser } from "@/lib/types";

function addHost(domains: Set<string>, hostname: string): void {
  const host = hostname.toLowerCase().trim();
  if (!host) return;
  domains.add(host);
  if (!host.startsWith("www.")) {
    domains.add(`www.${host}`);
  }
}

/** Comma-separated hostnames for Umami data-domains (must be non-empty). */
export function buildUmamiDomains(user: PublicUser): string {
  const domains = new Set<string>();

  try {
    addHost(domains, new URL(MARKETING_ORIGIN).hostname);
    addHost(domains, new URL(UGS_ORIGIN).hostname);
  } catch {
    return "";
  }

  if (hasActiveCustomDomain(user) && user.custom_domain) {
    addHost(domains, user.custom_domain);
  }

  return [...domains].join(",");
}
