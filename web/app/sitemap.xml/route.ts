import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/env";
import { isMainHost } from "@/lib/hosts";

const SERVER_API_URL = (process.env.INTERNAL_API_URL || API_URL).replace(/\/$/, "");
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

function apiHeaders(): HeadersInit {
  if (!INTERNAL_SECRET) return {};
  return { "x-internal-secret": INTERNAL_SECRET };
}

export async function GET() {
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0];

  if (!host) {
    return new NextResponse(EMPTY_SITEMAP, {
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }

  const endpoint = isMainHost(host)
    ? `${SERVER_API_URL}/sitemap.xml`
    : `${SERVER_API_URL}/public/custom-domain/sitemap.xml?host=${encodeURIComponent(host)}`;
  const res = await fetch(endpoint, { cache: "no-store", headers: apiHeaders() });

  if (!res.ok) {
    if (res.status === 404) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new NextResponse(EMPTY_SITEMAP, {
      status: res.status >= 500 ? 503 : res.status,
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }

  return new NextResponse(await res.text(), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
