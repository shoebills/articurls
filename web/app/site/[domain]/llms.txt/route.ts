import { NextRequest, NextResponse } from "next/server";
import { fetchCategories, fetchPublishedPosts } from "@/lib/seo-data";
import { resolveTenantSeo } from "@/lib/tenant-seo";

export const dynamic = "force-dynamic";

function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

function mdInline(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .replace(/[[\]<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
): Promise<Response> {
  const { domain } = await params;
  const host = decodeURIComponent(domain);

  const ctx = await resolveTenantSeo(host, req.headers.get("x-articurls-basepath"));
  if (!ctx) return new NextResponse(null, { status: 404 });

  const { site, subdomain, siteOrigin } = ctx;

  if (site.seo_indexing_enabled === false) {
    return new NextResponse(null, { status: 404 });
  }

  if (site.seo_llms_mode === "custom" && (site.seo_llms_custom || "").trim()) {
    return textResponse(site.seo_llms_custom!);
  }

  const siteName = mdInline(site.site_name || "") || site.subdomain;
  const description = mdInline(site.meta_description || "");

  const [posts, categories] = await Promise.all([
    fetchPublishedPosts(subdomain),
    fetchCategories(subdomain),
  ]);

  const sections: string[] = [];

  if (
    site.seo_noindex_categories !== true &&
    site.categories_hub_enabled !== false &&
    categories.length > 0
  ) {
    const items = categories.map(
      (c) => `- [${mdInline(c.name)}](${siteOrigin}/category/${encodeURIComponent(c.slug)})`,
    );
    sections.push(["## Categories", ...items].join("\n"));
  }

  const recentPosts = posts.slice(0, 10);
  if (recentPosts.length > 0) {
    const items = recentPosts.map(
      (p) => `- [${mdInline(p.title)}](${siteOrigin}/${encodeURIComponent(p.slug)})`,
    );
    sections.push(["## Recent posts", ...items].join("\n"));
  }

  const parts = [`# ${siteName}`];
  if (description) parts.push(`> ${description}`);
  parts.push(...sections);
  parts.push(`- [Sitemap](${siteOrigin}/sitemap.xml)`);
  const body = parts.join("\n\n") + "\n";

  return textResponse(body);
}