import { NextRequest, NextResponse } from "next/server";
import { fetchAuthors, fetchCategories, fetchPages, fetchPublishedPosts, fetchRedirects } from "@/lib/seo-data";
import { resolveTenantSeo } from "@/lib/tenant-seo";
import type { RedirectRule } from "@/lib/types";

export const dynamic = "force-dynamic";

function withTrailingSlash(url: string, enabled: boolean): string {
  if (!enabled || url.endsWith("/")) return url;
  return `${url}/`;
}

function isExternalCanonical(canonicalUrl: string | null | undefined, siteOrigin: string): boolean {
  if (!canonicalUrl) return false;
  try {
    return new URL(canonicalUrl).origin !== new URL(siteOrigin).origin;
  } catch {
    return false;
  }
}

function isoDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

function buildXml(
  entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[],
): string {
  const items = entries
    .map(({ loc, lastmod, changefreq, priority }) => {
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
      if (priority) parts.push(`    <priority>${priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
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

  if (site.seo_sitemap_enabled === false || site.seo_indexing_enabled === false) {
    return new NextResponse(null, { status: 404 });
  }

  const trailingSlash = site.seo_trailing_slash_listings === true;
  const today = new Date().toISOString().split("T")[0];

  const [blogs, pages, categories, authors, redirects] = await Promise.all([
    fetchPublishedPosts(subdomain),
    fetchPages(subdomain),
    fetchCategories(subdomain, true),
    fetchAuthors(subdomain),
    fetchRedirects(subdomain),
  ]);

  const redirectedSources = new Set(
    (redirects as RedirectRule[]).map((r) => r.source_path),
  );
  const isRedirected = (path: string) => redirectedSources.has(path);

  const indexableBlogs = blogs.filter(
    (b) => !b.noindex && !isExternalCanonical(b.canonical_url, siteOrigin) && !isRedirected(`/${b.slug}`),
  );
  const indexablePages = pages.filter(
    (p) => !p.noindex && !site.seo_noindex_pages && !isExternalCanonical(p.canonical_url, siteOrigin) && !isRedirected(`/${p.slug}`),
  );
  const indexableCategories = site.seo_noindex_categories
    ? []
    : categories.filter((c) => !isRedirected(`/category/${c.slug}`));
  const indexableAuthors = authors.filter(
    (a) => !a.noindex && !site.seo_noindex_authors && !isRedirected(`/author/${a.slug}`),
  );

  const entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  if (!isRedirected("/")) {
    entries.push({ loc: withTrailingSlash(siteOrigin, trailingSlash), lastmod: today, changefreq: "weekly", priority: "1.0" });
  }

  if (site.categories_hub_enabled !== false && indexableCategories.length > 0 && !isRedirected("/categories")) {
    entries.push({
      loc: withTrailingSlash(`${siteOrigin}/categories`, trailingSlash),
      changefreq: "weekly",
      priority: "0.6",
    });
  }

  for (const blog of indexableBlogs) {
    entries.push({
      loc: `${siteOrigin}/${encodeURIComponent(blog.slug)}`,
      lastmod: isoDate(blog.updated_at) ?? isoDate(blog.published_at),
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const page of indexablePages) {
    entries.push({
      loc: `${siteOrigin}/${encodeURIComponent(page.slug)}`,
      lastmod: isoDate(page.updated_at),
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  for (const cat of indexableCategories) {
    entries.push({
      loc: withTrailingSlash(`${siteOrigin}/category/${encodeURIComponent(cat.slug)}`, trailingSlash),
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  for (const author of indexableAuthors) {
    entries.push({
      loc: withTrailingSlash(`${siteOrigin}/author/${encodeURIComponent(author.slug)}`, trailingSlash),
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}