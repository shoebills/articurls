import { NextRequest, NextResponse } from "next/server";
import { assetUrl } from "@/lib/env";
import { buildRssXml, buildFeedItems, fetchCategories, fetchPublishedPosts } from "@/lib/seo-data";
import { resolveTenantSeo } from "@/lib/tenant-seo";

export const dynamic = "force-dynamic";

const MAX_RSS_ITEMS = 100;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
): Promise<Response> {
  const { domain } = await params;
  const host = decodeURIComponent(domain);

  const ctx = await resolveTenantSeo(host, req.headers.get("x-articurls-basepath"));
  if (!ctx) return new NextResponse(null, { status: 404 });

  const { site, subdomain, siteOrigin } = ctx;

  if (site.rss_enabled === false) return new NextResponse(null, { status: 404 });
  if (site.seo_indexing_enabled === false) return new NextResponse(null, { status: 404 });

  const [posts, categories] = await Promise.all([
    fetchPublishedPosts(subdomain),
    fetchCategories(subdomain, true),
  ]);

  const { items, lastBuildDate } = buildFeedItems(posts, categories, site, siteOrigin, MAX_RSS_ITEMS);

  const xml = buildRssXml({
    title: site.site_name || site.meta_title || `${site.owner_name} — Articurls`,
    link: siteOrigin,
    description: site.meta_description || `Latest posts by ${site.owner_name}.`,
    lastBuildDate,
    imageUrl: site.favicon_url ? assetUrl(site.favicon_url) : null,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}