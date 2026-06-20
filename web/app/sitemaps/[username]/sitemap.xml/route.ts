import { NextRequest, NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import { fetchCategories, fetchPages, fetchPublishedPosts, fetchSeoEligibility } from "@/lib/seo-data";
import { isIndexableDomainStatus } from "@/lib/seo";
import type { PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

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

function isoDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return undefined;
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

function resolveUsernameParam(params: Record<string, string | string[] | undefined>): string | null {
  const direct = params.username;
  if (typeof direct === "string" && direct.trim()) return direct;
  const firstString = Object.values(params).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? null;
}

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const routeParams = await params;
  const username = resolveUsernameParam(routeParams);
  if (!username) return new NextResponse(null, { status: 404 });

  const user = await loadUser(username);
  if (!user) return new NextResponse(null, { status: 404 });

  // This sitemap exists only for users indexed on articurls.com:
  // - Pro entitlement
  // - no active/grace custom domain
  const seoEligibility = await fetchSeoEligibility(user.user_name || username);
  if (!seoEligibility?.can_index_on_marketing) return new NextResponse(null, { status: 404 });
  if (isIndexableDomainStatus(user.domain_status)) return new NextResponse(null, { status: 404 });

  const usernamePath = encodeURIComponent(user.user_name || username);
  const siteOrigin = `${MARKETING_ORIGIN}/${usernamePath}`;

  const [blogs, pages, categories] = await Promise.all([
    fetchPublishedPosts(user.user_name || username),
    fetchPages(user.user_name || username),
    fetchCategories(user.user_name || username),
  ]);

  const entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];
  const today = new Date().toISOString().split("T")[0];
  entries.push({
    loc: siteOrigin,
    lastmod: today,
    changefreq: "weekly",
    priority: "1.0",
  });

  for (const blog of blogs) {
    entries.push({
      loc: `${siteOrigin}/blog/${encodeURIComponent(blog.slug)}`,
      lastmod: isoDate(blog.updated_at) ?? isoDate(blog.published_at),
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  for (const page of pages) {
    if (!page.show_in_footer) continue;
    entries.push({
      loc: `${siteOrigin}/page/${encodeURIComponent(page.slug)}`,
      lastmod: isoDate(page.updated_at),
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  for (const category of categories) {
    if (!category.show_in_menu) continue;
    entries.push({
      loc: `${siteOrigin}/category/${encodeURIComponent(category.slug)}`,
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
