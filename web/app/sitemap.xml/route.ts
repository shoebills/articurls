/**
 * Platform sitemap — serves articurls.com (marketing) and articurls.site
 * (UGC landing). Tenant sitemaps live under /site/[domain]/sitemap.xml and
 * are reached via the proxy rewrite.
 */

import { NextRequest, NextResponse } from "next/server";
import { MARKETING_ORIGIN, UGC_DOMAIN, UGC_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";

export const dynamic = "force-dynamic";

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

async function marketingDomainSitemap(): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  try {
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
    console.error("Failed to generate sitemap index:", error);
  }

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

export async function GET(req: NextRequest): Promise<Response> {
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (tenantHost.toLowerCase() === UGC_DOMAIN) {
    return ugcDomainSitemap();
  }

  if (tenantHost.toLowerCase().startsWith("app.articurls.com")) {
    return new NextResponse(null, { status: 404 });
  }

  return marketingDomainSitemap();
}