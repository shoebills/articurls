/**
 * Server-only Umami configuration for Next.js Route Handlers and rewrites.
 * Never import this from client components — UMAMI_ORIGIN must not leak to the browser.
 */
import { ipAddress } from "@vercel/functions";

export const UMAMI_SCRIPT_PATH = "/vitals.js";
export const UMAMI_COLLECT_PATH = "/site-vitals";

const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64KB max telemetry payload

const BUCKET_CAPACITY = 20;
const REFILL_RATE_PER_MS = 60 / 60_000; // 60 requests / minute (1 token / sec)
const MAX_TRACKED_IPS = 5_000;

type BucketState = {
  tokens: number;
  lastRefill: number;
};

const ipBuckets = new Map<string, BucketState>();

function checkSendRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const key = ip || "unknown";
  const now = Date.now();
  const existing = ipBuckets.get(key);

  let tokens = BUCKET_CAPACITY;
  if (existing) {
    const elapsed = Math.max(0, now - existing.lastRefill);
    tokens = Math.min(BUCKET_CAPACITY, existing.tokens + elapsed * REFILL_RATE_PER_MS);
    ipBuckets.delete(key);
  } else if (ipBuckets.size >= MAX_TRACKED_IPS) {
    const oldestKey = ipBuckets.keys().next().value;
    if (oldestKey !== undefined) {
      ipBuckets.delete(oldestKey);
    }
  }

  if (tokens >= 1) {
    ipBuckets.set(key, { tokens: tokens - 1, lastRefill: now });
    return { allowed: true, retryAfter: 0 };
  }

  ipBuckets.set(key, { tokens, lastRefill: now });
  const retryAfter = Math.max(1, Math.ceil((1 - tokens) / REFILL_RATE_PER_MS / 1000));
  return { allowed: false, retryAfter };
}

/** Normalized Umami origin (no trailing slash), or empty when analytics is not configured. */
export function getUmamiOrigin(): string {
  return process.env.UMAMI_ORIGIN?.trim().replace(/\/$/, "") || "";
}

/** True when first-party proxy (/vitals.js, /site-vitals) can target a live Umami instance. */
export function isUmamiProxyConfigured(): boolean {
  return getUmamiOrigin().length > 0;
}

/**
 * Real visitor IP from the browser request hitting Vercel.
 *
 * Vercel's ipAddress() reads x-real-ip or x-forwarded-for internal to Vercel's
 * edge network, returning the real visitor IP on all plans including Hobby.
 */
export function resolveVisitorIp(request: Request): string {
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

/**
 * Proxy the Umami tracker script first-party, rewriting `/api/send` in the
 * script body so the tracker posts to the neutral collection endpoint
 * (`UMAMI_COLLECT_PATH`) instead.
 */
export async function proxyUmamiScript(): Promise<Response> {
  if (!isUmamiProxyConfigured()) {
    return new Response(null, { status: 404 });
  }

  const origin = getUmamiOrigin();

  try {
    const upstream = await fetch(`${origin}/script.js`, {
      method: "GET",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const rawBody = await upstream.arrayBuffer();
    const body: BodyInit = new TextDecoder()
      .decode(rawBody)
      .replace(/\/api\/send/g, UMAMI_COLLECT_PATH);

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    } else {
      headers.set("Content-Type", "application/javascript; charset=utf-8");
    }
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    return new Response(body, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}

/** Proxy Umami event collection requests first-party with rate limiting and IP injection. */
export async function proxyUmamiSend(request: Request): Promise<Response> {
  if (!isUmamiProxyConfigured()) {
    return new Response(null, { status: 204 });
  }

  const clientIp = resolveVisitorIp(request);
  const rl = checkSendRateLimit(clientIp);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ detail: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfter),
      },
    });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return new Response(null, { status: 413 });
  }

  const origin = getUmamiOrigin();
  const rawBody = await request.arrayBuffer();
  if (rawBody.byteLength > MAX_PAYLOAD_BYTES) {
    return new Response(null, { status: 413 });
  }
  const body = injectVisitorIpIntoUmamiPayload(rawBody, clientIp);

  const forwardHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    forwardHeaders.set("Content-Type", contentType);
  } else {
    forwardHeaders.set("Content-Type", "application/json");
  }

  forwardHeaders.set("User-Agent", resolveForwardUserAgent(request));

  const referer = request.headers.get("referer");
  if (referer) {
    forwardHeaders.set("Referer", referer);
  }

  const umamiCache = request.headers.get("x-umami-cache");
  if (umamiCache) {
    forwardHeaders.set("x-umami-cache", umamiCache);
  }

  try {
    const upstream = await fetch(`${origin}/api/send`, {
      method: "POST",
      headers: forwardHeaders,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const responseBody = await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("Content-Type", upstreamContentType);
    }

    return new Response(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
