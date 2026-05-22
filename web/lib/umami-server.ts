/**
 * Server-only Umami configuration for Next.js Route Handlers and rewrites.
 * Never import this from client components — UMAMI_ORIGIN must not leak to the browser.
 */

/** Normalized Umami origin (no trailing slash), or empty when analytics is not configured. */
export function getUmamiOrigin(): string {
  return process.env.UMAMI_ORIGIN?.trim().replace(/\/$/, "") || "";
}

/** True when first-party proxy (/script.js, /api/send) can target a live Umami instance. */
export function isUmamiProxyConfigured(): boolean {
  return getUmamiOrigin().length > 0;
}

/**
 * Header Vercel sets on server-side POST to Umami. Must match Umami CLIENT_IP_HEADER.
 * Do not use X-Forwarded-For — Cloudflare on analytics.articurls.com overwrites it with
 * the Vercel egress IP (US), which breaks geo even when SKIP_LOCATION_HEADERS=1.
 */
export const UMAMI_VISITOR_IP_HEADER = "x-articurls-visitor-ip";

/**
 * Real visitor IP from the incoming browser request on Vercel (+ Cloudflare in front of articurls.com).
 * Prefer CF-Connecting-IP when present, then Vercel's x-real-ip (canonical on Vercel).
 */
export function resolveVisitorIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "";
}

const FALLBACK_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Umami rejects requests without a browser-like User-Agent. */
export function resolveForwardUserAgent(request: Request): string {
  return request.headers.get("user-agent")?.trim() || FALLBACK_USER_AGENT;
}
