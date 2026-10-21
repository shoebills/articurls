/**
 * Shared resolution for tenant SEO/feed route handlers (robots.txt, sitemap,
 * llms.txt, rss, atom, ads.txt). These live under `/site/[domain]/…` and are
 * reached via a proxy rewrite that passes the original path prefix in the
 * `x-articurls-basepath` header so we can validate it against the site's
 * configured subpath.
 */

import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicSite } from "@/lib/public-site";
import type { PublicSite } from "@/lib/types";

export function normalizeSubpath(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export interface TenantSeoContext {
  site: PublicSite;
  subdomain: string;
  siteOrigin: string;
  basePath: string;
}

/**
 * Resolve a tenant SEO/feed request to its site, enforcing that the requested
 * path prefix matches the site's configured subpath. Returns null (→ 404) for
 * unknown/inactive domains, canonical redirects, or a mismatched prefix.
 */
export async function resolveTenantSeo(
  host: string,
  requestedPrefix: string | null | undefined,
): Promise<TenantSeoContext | null> {
  const domainInfo = await resolveDomainForSeo(host);
  if (!domainInfo) return null;
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") return null;

  const configured = normalizeSubpath(domainInfo.custom_subpath);
  const requested = normalizeSubpath(requestedPrefix);
  if (configured !== requested) return null;

  // Declarative subpath rewrites (vercel.json, next.config.mjs) forward to
  // `{subdomain}.{ugc_domain}/{subpath}/*` without X-Original-Host, so
  // `redirect_to` is present even on legitimate proxied subpath requests.
  if (domainInfo.redirect_to && !configured) return null;

  const site = await loadPublicSite(domainInfo.subdomain);
  if (!site) return null;

  const effectiveHost = domainInfo.custom_domain || host;
  const basePath = configured ? `/${configured}` : "";
  const siteOrigin = `https://${effectiveHost}${basePath}`;

  return { site, subdomain: domainInfo.subdomain, siteOrigin, basePath };
}