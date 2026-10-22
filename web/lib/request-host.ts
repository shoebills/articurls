/**
 * Resolve the tenant/custom hostname from incoming request headers.
 *
 * CF SSL for SaaS (no Worker): customer Host is preserved end-to-end.
 * Subfolder reverse proxies point at our UGC subdomain and carry the real
 * customer host in `x-original-host`, which we only trust on that path.
 */

import { UGC_DOMAIN } from "@/lib/env";

const STATIC_INTERNAL_DOMAINS = new Set([
  "articurls.com",
  "articurls.site",
  "app.articurls.com",
  "api.articurls.com",
  "vitals.articurls.com",
]);

export function firstHeaderHost(raw: string | null): string {
  const first = (raw || "").toLowerCase().split(",")[0].trim();
  if (!first || first.startsWith("localhost:")) return first;
  return first.replace(/:\d+$/, "");
}

export function buildRuntimeHosts(appOrigin: string, marketingOrigin: string): string[] {
  const hosts: string[] = [];
  for (const origin of [appOrigin, marketingOrigin]) {
    if (!origin) continue;
    try {
      hosts.push(new URL(origin).hostname.toLowerCase());
    } catch {
      // ignore malformed env
    }
  }
  return hosts;
}

/** Runtime hosts from Next.js public env (app + marketing + UGC origins). */
export function buildRuntimeHostsFromEnv(): string[] {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "") || "";
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || "";
  const hosts = buildRuntimeHosts(appOrigin, marketingOrigin);

  const ugcOrigin = process.env.NEXT_PUBLIC_UGC_ORIGIN?.replace(/\/$/, "");
  if (ugcOrigin) {
    try {
      const host = new URL(ugcOrigin).hostname.toLowerCase();
      if (!hosts.includes(host)) hosts.push(host);
    } catch {
      // ignore malformed env
    }
  }

  return hosts;
}

export function isInternalHost(host: string, runtimeHosts: string[] = []): boolean {
  const h = host.toLowerCase();
  if (!h) return true;
  if (STATIC_INTERNAL_DOMAINS.has(h)) return true;
  if (h === "localhost" || h.startsWith("localhost:") || h === "127.0.0.1") return true;
  return runtimeHosts.includes(h);
}

export function isCustomDomainHost(host: string, runtimeHosts: string[] = []): boolean {
  return Boolean(host) && !isInternalHost(host, runtimeHosts);
}

/** True when `host` is a subdomain of the UGC apex (e.g. `john.articurls.site`). */
export function isUgcSubdomainHost(host: string): boolean {
  const h = (host || "").toLowerCase();
  if (!h) return false;
  const ugc = UGC_DOMAIN.toLowerCase();
  return h.endsWith(`.${ugc}`) && h !== ugc;
}

export function resolveTenantHost(
  headers: Headers,
  fallbackHostname = "",
  runtimeHosts: string[] = [],
): string {
  const hostHeader = firstHeaderHost(headers.get("host"));

  // Direct custom-domain request — Cloudflare SSL-for-SaaS / Vercel preserves the
  // customer Host end-to-end, so Host is the tenant.
  if (isCustomDomainHost(hostHeader, runtimeHosts) && !isUgcSubdomainHost(hostHeader)) {
    return hostHeader;
  }

  // Requests landing on our UGC subdomain (including reverse-proxied subfolder
  // requests) resolve by their permanent `{subdomain}.{ugc_domain}` host so
  // multiple subfolder publications on the same domain remain unambiguous.
  if (isUgcSubdomainHost(hostHeader)) {
    return hostHeader;
  }

  // Platform apex hosts (articurls.com, app.articurls.com, articurls.site,
  // api.articurls.com): ignore client-supplied forwarding headers.
  return hostHeader || fallbackHostname.toLowerCase();
}

/** For Next.js route handlers (robots, sitemap, rss). */
export function resolveTenantHostFromRequest(
  req: { headers: Headers; nextUrl: { hostname: string } },
  runtimeHosts: string[] = buildRuntimeHostsFromEnv(),
): string {
  return resolveTenantHost(req.headers, req.nextUrl.hostname, runtimeHosts);
}

/** Normalize proxy downstream headers for site publication routes. */
export function withTenantHostHeader(
  requestHeaders: Headers,
  tenantHost: string,
): Headers {
  const headers = new Headers(requestHeaders);
  headers.set("x-original-host", tenantHost);
  const basepath = requestHeaders.get("x-articurls-basepath");
  if (basepath) {
    headers.set("x-articurls-basepath", basepath);
  }
  return headers;
}
