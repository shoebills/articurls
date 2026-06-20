/**
 * Marketing pages sitemap — Platform-level static pages.
 * 
 * Returns a sitemap containing all indexable marketing pages:
 * - Homepage
 * - Pricing
 * - Features
 * - About
 * - Terms
 * - Privacy
 * - etc.
 * 
 * This route is referenced by the root sitemap at /sitemap.xml.
 */

import { NextRequest } from "next/server";
import { MARKETING_ORIGIN } from "@/lib/env";

export const dynamic = "force-dynamic";

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  // Marketing pages to include in sitemap
  const entries = [
    {
      loc: `${MARKETING_ORIGIN}/`,
      lastmod: today,
      changefreq: "daily",
      priority: "1.0",
    },
    // Add more marketing pages here as they're created:
    // { loc: `${MARKETING_ORIGIN}/pricing`, lastmod: today, changefreq: "weekly", priority: "0.9" },
    // { loc: `${MARKETING_ORIGIN}/features`, lastmod: today, changefreq: "weekly", priority: "0.9" },
    // { loc: `${MARKETING_ORIGIN}/about`, lastmod: today, changefreq: "monthly", priority: "0.7" },
    // { loc: `${MARKETING_ORIGIN}/terms`, lastmod: today, changefreq: "monthly", priority: "0.5" },
    // { loc: `${MARKETING_ORIGIN}/privacy`, lastmod: today, changefreq: "monthly", priority: "0.5" },
  ];

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600, stale-if-error=86400",
    },
  });
}
