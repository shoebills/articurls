import {
  getUmamiOrigin,
  injectVisitorIpIntoUmamiPayload,
  isUmamiProxyConfigured,
  resolveForwardUserAgent,
  resolveVisitorIp,
} from "@/lib/umami-server";

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

export async function POST(request: Request) {
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

export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST" },
  });
}
