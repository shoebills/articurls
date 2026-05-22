/**
 * Server-only Umami configuration for Next.js Route Handlers and rewrites.
 * Never import this from client components — UMAMI_ORIGIN must not leak to the browser.
 */
import { ipAddress } from "@vercel/functions";

/** Normalized Umami origin (no trailing slash), or empty when analytics is not configured. */
export function getUmamiOrigin(): string {
  return process.env.UMAMI_ORIGIN?.trim().replace(/\/$/, "") || "";
}

/** True when first-party proxy (/script.js, /api/send) can target a live Umami instance. */
export function isUmamiProxyConfigured(): boolean {
  return getUmamiOrigin().length > 0;
}

/**
 * Real visitor IP from the browser request hitting Vercel.
 *
 * Cloudflare sits in front of articurls.com and tenant custom domains. CF sets
 * cf-connecting-ip to the visitor; x-real-ip (what ipAddress() reads) is often
 * the Cloudflare edge PoP (e.g. Singapore for IN users).
 */
export function resolveVisitorIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const fromVercel = ipAddress(request);
  if (fromVercel) return fromVercel;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "";
}

type UmamiSendBody = {
  type?: string;
  payload?: Record<string, unknown>;
};

/**
 * Inject payload.ip before forwarding to Umami.
 *
 * Umami getClientInfo() uses payload.ip when present and runs MaxMind geo on it,
 * skipping CF/Vercel location headers (which reflect Vercel egress on analytics.*).
 * This is the supported server-side proxy pattern — not header spoofing.
 */
export function injectVisitorIpIntoUmamiPayload(body: ArrayBuffer, clientIp: string): BodyInit {
  if (!clientIp) return body;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(body)) as UmamiSendBody;
    if (!parsed.payload || typeof parsed.payload !== "object") {
      return body;
    }
    parsed.payload.ip = clientIp;
    return JSON.stringify(parsed);
  } catch {
    return body;
  }
}

const FALLBACK_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Umami rejects requests without a browser-like User-Agent. */
export function resolveForwardUserAgent(request: Request): string {
  return request.headers.get("user-agent")?.trim() || FALLBACK_USER_AGENT;
}
