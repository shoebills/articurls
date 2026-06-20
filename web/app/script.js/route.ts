import { getUmamiOrigin, isUmamiProxyConfigured } from "@/lib/umami-server";

const UPSTREAM_TIMEOUT_MS = 10_000;

/** Proxy Umami tracker script first-party (runtime env — no build-time rewrite required). */
export async function GET() {
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

    const body = await upstream.arrayBuffer();
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
