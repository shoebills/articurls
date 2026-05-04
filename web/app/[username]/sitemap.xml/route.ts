/**
 * Per-user sitemap on the marketing domain.
 * articurls.com/[username]/sitemap.xml
 *
 * DUPLICATE INDEXING PROTECTION (core invariant):
 * If the user has an active or grace custom domain, this sitemap returns
 * HTTP 404. The canonical sitemap lives at https://custom.com/sitemap.xml.
 * Returning 404 (not an empty sitemap) ensures Google drops this URL from
 * its index rather than treating it as a valid but empty sitemap.
 *
 * Only returns content when:
 * - User exists
 * - domain_status is NOT "active" or "grace" (i.e. no active custom domain)
 * - sitemap_enabled is true (user has not opted out)
 */

import { NextRequest, NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import type { PublicUser, PublicBlog, UserPage } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Data loaders ──────────────────────────────────────────────────────────────

async function loadUser(username: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function loadBlogs(username: string): Promise<PublicBlog[]> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blogs`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function loadPages(username: string): Promise<UserPage[]> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

interface Category {
  category_id: number;
  slug: string;
  show_in_menu: boolean;
}

async function loadCategories(username: string): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/categories`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── XML builder ───────────────────────────────────────────────────────────────

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
): Promise<Response> {
  const { username } = await params;

  const user = await loadUser(username);

  // Unknown user → 404
  if (!user) {
    return new NextResponse(null, { status: 404 });
  }

  // DUPLICATE INDEXING GUARD:
  // If this user has an active or grace custom domain, their canonical sitemap
  // is at https://custom.com/sitemap.xml. Return 404 here so Google removes
  // this URL from its index and consolidates signals on the custom domain.
  const domainStatus = user.domain_status ?? "none";
  if (domainStatus === "active" || domainStatus === "grace") {
    return new NextResponse(null, { status: 404 });
  }

  // User has opted out of sitemap generation
  if (user.sitemap_enabled === false) {
    return new NextResponse(null, { status: 404 });
  }

  const base = `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}`;
  const today = new Date().toISOString().split("T")[0];

  const [blogs, pages, categories] = await Promise.all([
    loadBlogs(username),
    loadPages(username),
    loadCategories(username),
  ]);

  const entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  // Profile / home
  entries.push({
    loc: `${base}`,
    lastmod: today,
    changefreq: "weekly",
    priority: "1.0",
  });

  // Published blog posts — use updated_at as lastmod
  for (const blog of blogs) {
    entries.push({
      loc: `${base}/blog/${encodeURIComponent(blog.slug)}`,
      lastmod: isoDate(blog.updated_at) ?? isoDate(blog.published_at),
      changefreq: "monthly",
      priority: "0.8",
    });
  }

  // User pages — only those visible in footer (matches public API filter)
  for (const page of pages) {
    if (!page.show_in_footer) continue;
    entries.push({
      loc: `${base}/page/${encodeURIComponent(page.slug)}`,
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  // Categories — only those visible in menu (matches public API filter)
  for (const cat of categories) {
    if (!cat.show_in_menu) continue;
    entries.push({
      loc: `${base}/category/${encodeURIComponent(cat.slug)}`,
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
