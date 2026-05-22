import {
  getUmamiOrigin,
  isUmamiProxyConfigured,
  resolveForwardUserAgent,
  resolveVisitorIp,
  UMAMI_VISITOR_IP_HEADER,
} from "@/lib/umami-server";

const UPSTREAM_TIMEOUT_MS = 10_000;

export async function POST(request: Request) {
  if (!isUmamiProxyConfigured()) {
    return new Response(null, { status: 204 });
  }

  const origin = getUmamiOrigin();
  const body = await request.arrayBuffer();

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

  const clientIp = resolveVisitorIp(request);
  if (clientIp) {
    forwardHeaders.set(UMAMI_VISITOR_IP_HEADER, clientIp);
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
