import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/env";
import type { PublicUser } from "@/lib/types";
import { buildRssXml, fetchPublishedPosts, type RssItem } from "@/lib/seo-data";

export const dynamic = "force-dynamic";

const MAX_RSS_ITEMS = 100;

const INTERNAL_HOSTNAMES = new Set([
  "articurls.com",
  "app.articurls.com",
  "api.articurls.com",
  "blogs.articurls.com",
  "fallback.articurls.com",
]);

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (INTERNAL_HOSTNAMES.has(h)) return true;
  return h === "localhost" || h.startsWith("localhost:") || h === "127.0.0.1";
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function resolveDomainInfo(
  host: string,
): Promise<{ username: string; domain_status: string } | null> {
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        cache: "no-store",
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function loadUser(username: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicUser;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestHost = req.nextUrl.hostname;
  const originalHostRaw = req.headers.get("x-original-host");
  const forwardedHostRaw = req.headers.get("x-forwarded-host");
  const hostHeaderRaw = req.headers.get("host");

  const firstHost = (raw: string | null): string =>
    (raw || "").toLowerCase().split(",")[0].trim();

  const effectiveHost =
    firstHost(originalHostRaw) ||
    firstHost(forwardedHostRaw) ||
    firstHost(hostHeaderRaw) ||
    requestHost.toLowerCase();

  if (!effectiveHost || isInternalHost(effectiveHost)) {
    return new NextResponse(null, { status: 404 });
  }

  const domainInfo = await resolveDomainInfo(effectiveHost);
  if (!domainInfo) return new NextResponse(null, { status: 404 });
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return new NextResponse(null, { status: 404 });
  }

  const user = await loadUser(domainInfo.username);
  if (!user) return new NextResponse(null, { status: 404 });
  if (user.rss_enabled === false) return new NextResponse(null, { status: 404 });
  if (user.sitemap_enabled === false) return new NextResponse(null, { status: 404 });

  const posts = await fetchPublishedPosts(domainInfo.username);
  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.published_at || b.updated_at) - toTimestamp(a.published_at || a.updated_at),
  );

  const siteOrigin = `https://${effectiveHost}`;
  const items: RssItem[] = sorted.slice(0, MAX_RSS_ITEMS).map((post) => {
    const link = `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`;
    return {
      title: post.title || "Untitled post",
      link,
      guid: link,
      pubDate: post.published_at || post.updated_at,
      description: post.meta_description || post.excerpt || "",
    };
  });

  const xml = buildRssXml({
    title: user.meta_title || `${user.name} — Articurls`,
    link: siteOrigin,
    description: user.meta_description || `Latest posts by ${user.name}.`,
    lastBuildDate: sorted[0]?.updated_at || sorted[0]?.published_at || null,
    items,
  });

  return new Response(xml, {
    headers: {
      // Use XML content-type so browsers render similarly to sitemap.xml.
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "x-original-host, x-forwarded-host, host",
    },
  });
}
