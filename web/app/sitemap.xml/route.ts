/**
 * Unified sitemap handler — serves both articurls.com and custom domains.
 *
 * The middleware exempts /sitemap.xml from the custom-domain rewrite, so ALL
 * requests for /sitemap.xml — whether from articurls.com or blog.example.com —
 * land here. The x-original-host header (set by middleware for custom domains)
 * is used to distinguish the two cases.
 *
 * ── Custom domain request (x-original-host is a non-internal hostname) ──────
 *   - Resolves the domain to a username via /internal/domain-lookup.
 *   - Returns 404 for pending/expired/none (don't index unverified domains).
 *   - Returns 404 if sitemap_enabled = false.
 *   - All URLs use https://{custom_domain}/... — NEVER articurls.com.
 *
 * ── Marketing domain request (no x-original-host, or internal hostname) ─────
 *   - Returns platform-level marketing pages only (home page).
 *   - User content is NOT included here; it lives at /[username]/sitemap.xml.
 *   - /[username]/sitemap.xml returns 404 when the user has an active/grace
 *     custom domain, enforcing the one-domain-indexed-at-a-time invariant.
 */

import { NextRequest, NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import type { PublicBlog, UserPage } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── Internal domain list (mirrors middleware.ts) ──────────────────────────────

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
  // Also treat localhost / 127.0.0.1 as internal (dev)
  return h === "localhost" || h.startsWith("localhost:") || h === "127.0.0.1";
}

// ── Domain resolution ─────────────────────────────────────────────────────────

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

// ── Data loaders ──────────────────────────────────────────────────────────────

async function loadUser(username: string) {
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

// ── Custom domain sitemap ─────────────────────────────────────────────────────

async function customDomainSitemap(host: string): Promise<Response> {
  const domainInfo = await resolveDomainInfo(host);

  if (!domainInfo) return new NextResponse(null, { status: 404 });

  // Only active and grace domains get a sitemap.
  // pending → not verified yet, don't index.
  // expired → 301 redirects to articurls, don't index here.
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return new NextResponse(null, { status: 404 });
  }

  const { username } = domainInfo;
  const user = await loadUser(username);

  if (!user) return new NextResponse(null, { status: 404 });

  // User has opted out
  if (user.sitemap_enabled === false) return new NextResponse(null, { status: 404 });

  // All URLs use the custom domain — NEVER articurls.com
  const siteOrigin = `https://${host}`;
  const today = new Date().toISOString().split("T")[0];

  const [blogs, pages, categories] = await Promise.all([
    loadBlogs(username),
    loadPages(username),
    loadCategories(username),
  ]);

  const entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  // Profile / home — custom domain root, no username prefix
  entries.push({ loc: siteOrigin, lastmod: today, changefreq: "weekly", priority: "1.0" });

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

  for (const cat of categories) {
    if (!cat.show_in_menu) continue;
    entries.push({
      loc: `${siteOrigin}/category/${encodeURIComponent(cat.slug)}`,
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

// ── Marketing domain sitemap ──────────────────────────────────────────────────

function marketingDomainSitemap(): Response {
  const today = new Date().toISOString().split("T")[0];

  // Platform-level pages only. User content lives at /[username]/sitemap.xml.
  const entries = [
    { loc: `${MARKETING_ORIGIN}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
  ];

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  // Middleware sets x-original-host for custom domain requests on exempt paths.
  // For internal/marketing domain requests this header is absent.
  const originalHost = req.headers.get("x-original-host");

  if (originalHost && !isInternalHost(originalHost)) {
    return customDomainSitemap(originalHost);
  }

  // app.articurls.com → no sitemap (dashboard/auth domain)
  const host = req.headers.get("host") || "";
  if (host.toLowerCase().startsWith("app.articurls.com")) {
    return new NextResponse(null, { status: 404 });
  }

  return marketingDomainSitemap();
}
