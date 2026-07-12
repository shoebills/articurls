/**
 * Resolve the tenant/custom hostname from incoming request headers.
 *
 * CF SSL for SaaS (no Worker): customer Host is preserved end-to-end.
 * Legacy Worker path: Host is blogs/fallback; x-original-host holds the tenant.
 */

const STATIC_INTERNAL_DOMAINS = new Set([
  "articurls.com",
  "app.articurls.com",
  "api.articurls.com",
  "blogs.articurls.com",
  "fallback.articurls.com",
]);

export function firstHeaderHost(raw: string | null): string {
  return (raw || "").toLowerCase().split(",")[0].trim();
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

/** Runtime hosts from Next.js public env (app + marketing origins). */
export function buildRuntimeHostsFromEnv(): string[] {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "") || "";
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || "";
  return buildRuntimeHosts(appOrigin, marketingOrigin);
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

export function resolveTenantHost(
  headers: Headers,
  fallbackHostname = "",
  runtimeHosts: string[] = [],
): string {
  const hostHeader = firstHeaderHost(headers.get("host"));
  const xOriginal = firstHeaderHost(headers.get("x-original-host"));
  const forwarded = firstHeaderHost(headers.get("x-forwarded-host"));

  if (isCustomDomainHost(hostHeader, runtimeHosts)) {
    return hostHeader;
  }
  if (isCustomDomainHost(xOriginal, runtimeHosts)) {
    return xOriginal;
  }
  if (isCustomDomainHost(forwarded, runtimeHosts)) {
    return forwarded;
  }

  return hostHeader || xOriginal || forwarded || fallbackHostname.toLowerCase();
}

/** For Next.js route handlers (robots, sitemap, rss). */
export function resolveTenantHostFromRequest(
  req: { headers: Headers; nextUrl: { hostname: string } },
  runtimeHosts: string[] = buildRuntimeHostsFromEnv(),
): string {
  return resolveTenantHost(req.headers, req.nextUrl.hostname, runtimeHosts);
}

/** For Next.js server components (custom-domain page). */
export function resolveTenantHostFromHeaders(
  headers: Headers,
  runtimeHosts: string[] = buildRuntimeHostsFromEnv(),
): string {
  return resolveTenantHost(headers, "", runtimeHosts);
}

/** Normalize middleware downstream headers for custom-domain routes. */
export function withTenantHostHeader(
  requestHeaders: Headers,
  tenantHost: string,
): Headers {
  const headers = new Headers(requestHeaders);
  headers.set("x-original-host", tenantHost);
  return headers;
}
