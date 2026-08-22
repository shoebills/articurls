import { NextRequest, NextResponse } from "next/server";
import { API_URL, assetUrl } from "@/lib/env";
import type { PublicUser } from "@/lib/types";
import { buildRssXml, fetchPublishedPosts, fetchCategories, type RssItem } from "@/lib/seo-data";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";

export const dynamic = "force-dynamic";

const MAX_RSS_ITEMS = 100;

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
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
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const effectiveHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (!effectiveHost || isInternalHost(effectiveHost, runtimeHosts)) {
    return new NextResponse(null, { status: 404 });
  }

  const domainInfo = await resolveDomainForSeo(effectiveHost);
  if (!domainInfo) return new NextResponse(null, { status: 404 });

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return new NextResponse(null, { status: 404 });
  }

  if (domainInfo.redirect_to) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await loadUser(domainInfo.username);
  if (!user) return new NextResponse(null, { status: 404 });
  if (user.rss_enabled === false) return new NextResponse(null, { status: 404 });

  const [posts, categories] = await Promise.all([
    fetchPublishedPosts(domainInfo.username),
    fetchCategories(domainInfo.username, true),
  ]);

  const catMap = new Map(categories.map((c) => [c.category_id, c.name]));

  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.published_at || b.updated_at) - toTimestamp(a.published_at || a.updated_at),
  );

  const customSubpath = (domainInfo.custom_subpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const basePath = customSubpath ? `/${customSubpath}` : "";
  const siteOrigin = `https://${effectiveHost}${basePath}`;

  const items: RssItem[] = sorted.slice(0, MAX_RSS_ITEMS).map((post) => {
    const link = `${siteOrigin}/blog/${encodeURIComponent(post.slug)}`;
    const categoryNames = (post.category_ids || [])
      .map((id) => catMap.get(id))
      .filter((name): name is string => !!name);

    return {
      title: post.title || "Untitled post",
      link,
      guid: link,
      pubDate: post.published_at || post.updated_at,
      description: post.meta_description || post.excerpt || "",
      authorName: post.author?.name || user.name,
      categoryNames,
      imageUrl: post.featured_image_url ? assetUrl(post.featured_image_url) : null,
    };
  });

  const xml = buildRssXml({
    title: user.nav_blog_name || user.meta_title || `${user.name} — Articurls`,
    link: siteOrigin,
    description: user.meta_description || `Latest posts by ${user.name}.`,
    lastBuildDate: sorted[0]?.updated_at || sorted[0]?.published_at || null,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "Host, x-original-host, x-forwarded-host",
    },
  });
}
