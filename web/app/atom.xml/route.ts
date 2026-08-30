import { NextRequest, NextResponse } from "next/server";
import { API_URL, assetUrl } from "@/lib/env";
import type { PublicSite } from "@/lib/types";
import { buildAtomXml, fetchPublishedPosts, fetchCategories, type RssItem } from "@/lib/seo-data";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";

export const dynamic = "force-dynamic";

const MAX_FEED_ITEMS = 100;

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function loadSite(subdomain: string): Promise<PublicSite | null> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSite;
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

  const site = await loadSite(domainInfo.subdomain);
  if (!site) return new NextResponse(null, { status: 404 });
  if (site.rss_enabled === false) return new NextResponse(null, { status: 404 });

  const [posts, categories] = await Promise.all([
    fetchPublishedPosts(domainInfo.subdomain),
    fetchCategories(domainInfo.subdomain, true),
  ]);

  const catMap = new Map(categories.map((c) => [c.category_id, c.name]));

  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.published_at || b.updated_at) - toTimestamp(a.published_at || a.updated_at),
  );

  const customSubpath = (domainInfo.custom_subpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const basePath = customSubpath ? `/${customSubpath}` : "";
  const siteOrigin = `https://${effectiveHost}${basePath}`;

  const items: RssItem[] = sorted.slice(0, MAX_FEED_ITEMS).map((post) => {
    const link = `${siteOrigin}/${encodeURIComponent(post.slug)}`;
    const categoryNames = (post.category_ids || [])
      .map((id) => catMap.get(id))
      .filter((name): name is string => !!name);

    return {
      title: post.title || "Untitled post",
      link,
      guid: link,
      pubDate: post.published_at || post.updated_at,
      description: post.meta_description || post.excerpt || "",
      authorName: post.author?.name || site.name,
      categoryNames,
      imageUrl: post.featured_image_url ? assetUrl(post.featured_image_url) : null,
    };
  });

  const xml = buildAtomXml({
    title: site.nav_blog_name || site.meta_title || `${site.name} — Articurls`,
    link: siteOrigin,
    description: site.meta_description || `Latest posts by ${site.name}.`,
    authorName: site.name,
    updated: sorted[0]?.updated_at || sorted[0]?.published_at || null,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "Host, x-original-host, x-forwarded-host",
    },
  });
}
