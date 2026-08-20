/**
 * Unified sitemap handler — serves both articurls.com and custom domains.
 *
 * The middleware exempts /sitemap.xml from the custom-domain rewrite, so ALL
 * requests for /sitemap.xml — whether from articurls.com or blog.example.com —
 * land here. resolveTenantHost() reads Host (CF SaaS) or x-original-host (legacy Worker).
 * is used to distinguish the two cases.
 *
 * ── Custom domain request (x-original-host is a non-internal hostname) ──────
 *   - Resolves the domain to a username via /internal/domain-lookup.
 *   - Returns 404 for pending/expired/none (don't index unverified domains).
 *   - All URLs use https://{custom_domain}/... — NEVER articurls.com.
 *
 * ── Marketing domain request (no x-original-host, or internal hostname) ─────
 *   - Returns platform-level marketing pages sitemap index only.
 *   - User content is never indexed on articurls.com in the new policy.
 */

import { NextRequest, NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN, UGC_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import type { PublicBlog, UserPage } from "@/lib/types";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import { fetchAuthors } from "@/lib/seo-data";

export const dynamic = "force-dynamic";

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

async function loadCategories(username: string, all = false): Promise<Category[]> {
  try {
    const q = all ? "?all=true" : "";
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/categories${q}`, {
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

function buildSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
  const items = sitemaps
    .map(({ loc, lastmod }) => {
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
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
  const domainInfo = await resolveDomainForSeo(host);

  if (!domainInfo) return new NextResponse(null, { status: 404 });

  // Only active and grace domains get a sitemap.
  // pending → not verified yet, don't index.
  // expired → 301 redirects to articurls, don't index here.
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return new NextResponse(null, { status: 404 });
  }

  if (domainInfo.redirect_to) {
    return new NextResponse(null, { status: 404 });
  }

  const { username } = domainInfo;
  const user = await loadUser(username);

  if (!user) return new NextResponse(null, { status: 404 });

  const customSubpath = (domainInfo.custom_subpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const basePath = customSubpath ? `/${customSubpath}` : "";
  const siteOrigin = `https://${host}${basePath}`;
  const today = new Date().toISOString().split("T")[0];

  const [blogs, pages, categories, authors] = await Promise.all([
    loadBlogs(username),
    loadPages(username),
    loadCategories(username, true),
    fetchAuthors(username),
  ]);

  const entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[] = [];

  // Profile / home — custom domain root, no username prefix
  entries.push({ loc: siteOrigin, lastmod: today, changefreq: "weekly", priority: "1.0" });

  if (categories.length > 0) {
    entries.push({
      loc: `${siteOrigin}/categories`,
      changefreq: "weekly",
      priority: "0.6",
    });
  }

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
    entries.push({
      loc: `${siteOrigin}/category/${encodeURIComponent(cat.slug)}`,
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  for (const author of authors) {
    entries.push({
      loc: `${siteOrigin}/author/${encodeURIComponent(author.slug)}`,
      changefreq: "weekly",
      priority: "0.5",
    });
  }

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "x-original-host",
    },
  });
}

// ── Marketing domain sitemap ──────────────────────────────────────────────────

/**
 * Root sitemap index for articurls.com.
 *
 * Returns a sitemap index pointing only to:
 * - /sitemaps/pages.xml (marketing pages)
 *
 * Fallback: If anything fails, returns a basic sitemap with homepage only.
 */
async function marketingDomainSitemap(): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  try {
    // Return sitemap index pointing only to marketing pages
    const sitemaps = [
      {
        loc: `${MARKETING_ORIGIN}/sitemaps/pages.xml`,
        lastmod: today,
      },
    ];

    return new Response(buildSitemapIndex(sitemaps), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Vary": "Host",
      },
    });
  } catch (error) {
    // Unexpected error — fall through to fallback
    console.error("Failed to generate sitemap index:", error);
  }

  // Fallback: Return basic sitemap with platform homepage only
  const entries = [
    { loc: `${MARKETING_ORIGIN}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
  ];

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "Host",
    },
  });
}

// ── UGC domain sitemap ────────────────────────────────────────────────────────

/**
 * Sitemap for articurls.site — landing page only.
 * User content is on subdomains ({username}.articurls.site/sitemap.xml).
 */
async function ugcDomainSitemap(): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  const entries = [
    { loc: `${UGC_ORIGIN}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
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
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (!isInternalHost(tenantHost, runtimeHosts)) {
    return customDomainSitemap(tenantHost);
  }

  if (tenantHost.toLowerCase() === "articurls.site") {
    return ugcDomainSitemap();
  }

  if (tenantHost.toLowerCase().startsWith("app.articurls.com")) {
    return new NextResponse(null, { status: 404 });
  }

  return marketingDomainSitemap();
}
