import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import { isMainHost } from "@/lib/hosts";

const SERVER_API_URL = (process.env.INTERNAL_API_URL || API_URL).replace(/\/$/, "");
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

function apiHeaders(): HeadersInit {
  if (!INTERNAL_SECRET) return {};
  return { "x-internal-secret": INTERNAL_SECRET };
}

export async function GET() {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0];

  if (!host) {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (isMainHost(host)) {
    return new NextResponse(
      `User-agent: *\nAllow: /\n\nSitemap: ${MARKETING_ORIGIN}/sitemap.xml\n`,
      { headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const endpoint = `${SERVER_API_URL}/public/custom-domain/robots.txt?host=${encodeURIComponent(host)}`;

  const res = await fetch(endpoint, { cache: "no-store", headers: apiHeaders() });
  if (!res.ok) {
    if (res.status === 404) {
      return new NextResponse("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: res.status >= 500 ? 503 : res.status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(await res.text(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
