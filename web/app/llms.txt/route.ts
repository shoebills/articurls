/**
 * Unified llms.txt handler — serves both articurls.com and custom domains.
 *
 * Mirrors the robots.txt/sitemap.xml tenant resolution: the middleware
 * exempts /llms.txt from the custom-domain rewrite, so all hosts land here.
 *
 * ── Custom domain request ────────────────────────────────────────────────────
 *   - active / grace   → auto-generated markdown or user custom text.
 *   - pending/expired  → 404 (same policy as sitemap).
 *   - unknown host     → 404.
 *
 * ── Marketing domain request ─────────────────────────────────────────────────
 *   - Platform-level llms.txt describing Articurls itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import type { PublicSite } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadSite(subdomain: string): Promise<PublicSite | null> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function textResponse(body: string, headers: Record<string, string>): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      ...headers,
    },
  });
}

// ── Custom domain llms.txt ───────────────────────────────────────────────────

async function customDomainLlms(host: string): Promise<Response> {
  const domainInfo = await resolveDomainForSeo(host);

  if (!domainInfo) return new NextResponse(null, { status: 404 });

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return new NextResponse(null, { status: 404 });
  }

  if (domainInfo.redirect_to) {
    return new NextResponse(null, { status: 404 });
  }

  const site = await loadSite(domainInfo.subdomain);
  if (!site) return new NextResponse(null, { status: 404 });

  if (site.seo_indexing_enabled === false) {
    return new NextResponse(null, { status: 404 });
  }

  const customSubpath = (domainInfo.custom_subpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const basePath = customSubpath ? `/${customSubpath}` : "";
  const siteOrigin = `https://${host}${basePath}`;

  if (site.seo_llms_mode === "custom" && (site.seo_llms_custom || "").trim()) {
    return textResponse(site.seo_llms_custom!.replace(/\r/g, ""), {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Vary": "x-original-host",
    });
  }

  const siteName = (site.site_name || "").trim() || site.name || site.subdomain;
  const description = (site.meta_description || "").trim();
  const body = `# ${siteName}
${description ? `> ${description}\n` : ""}
${site.seo_noindex_categories ? "" : `- [All categories](${siteOrigin}/categories)`}
- [Sitemap](${siteOrigin}/sitemap.xml)
`;

  return textResponse(body.trimEnd() + "\n", {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    "Vary": "x-original-host",
  });
}

// ── Marketing domain llms.txt ────────────────────────────────────────────────

function marketingDomainLlms(): Response {
  const body = `# Articurls
> The blogging platform for builders.

- [Home](${MARKETING_ORIGIN}/)
- [Pricing](${MARKETING_ORIGIN}/pricing)
- [Sitemap](${MARKETING_ORIGIN}/sitemap.xml)
`;
  return textResponse(body, {
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    "Vary": "Host",
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (!isInternalHost(tenantHost, runtimeHosts)) {
    return customDomainLlms(tenantHost);
  }

  if (tenantHost.toLowerCase().startsWith("app.articurls.com")) {
    return new NextResponse(null, { status: 404 });
  }

  return marketingDomainLlms();
}