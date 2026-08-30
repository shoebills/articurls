/**
 * Unified robots.txt handler — serves both articurls.com and custom domains.
 *
 * The middleware exempts /robots.txt from the custom-domain rewrite, so ALL
 * requests for /robots.txt — whether from articurls.com or blog.example.com —
 * land here. resolveTenantHost() reads Host (CF SaaS) or x-original-host (legacy Worker).
 * is used to distinguish the two cases.
 *
 * ── Custom domain request (x-original-host is a non-internal hostname) ──────
 *   - active / grace  → Allow all, sitemap points to custom domain.
 *   - pending         → Disallow all (not verified yet).
 *   - expired         → Disallow all (content redirects to articurls).
 *   - unknown host    → Disallow all (safe default).
 *
 * ── Marketing domain request (no x-original-host, or internal hostname) ─────
 *   - Blocks dashboard, auth, and internal routes.
 *   - Allows all public site content.
 *   - Canonical tags + 301 redirects handle consolidation for custom domain
 *     users; no Disallow needed for their articurls URLs.
 */

import { NextRequest } from "next/server";
import { API_URL, MARKETING_ORIGIN, UGC_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";

export const dynamic = "force-dynamic";

const DISALLOW_ALL = "User-agent: *\nDisallow: /\n";

async function loadSite(subdomain: string) {
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


// ── Custom domain robots.txt ──────────────────────────────────────────────────

async function customDomainRobots(host: string): Promise<Response> {
  const domainInfo = await resolveDomainForSeo(host);

  if (!domainInfo) {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Vary": "x-original-host",
      },
    });
  }

  const { domain_status, subdomain } = domainInfo;

  // pending → not verified, prevent indexing
  // expired → content redirects to articurls, prevent indexing here
  if (domain_status === "pending" || domain_status === "expired") {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Vary": "x-original-host",
      },
    });
  }

  if (domain_status !== "active" && domain_status !== "grace") {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Vary": "x-original-host",
      },
    });
  }

  // Host is not canonical — prevent crawl budget waste.
  if (domainInfo.redirect_to) {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Vary": "x-original-host",
      },
    });
  }

  const site = await loadSite(subdomain);

  if (!site) {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Vary": "x-original-host",
      },
    });
  }

  const siteOrigin = `https://${host}`;
  const body = `User-agent: *
Allow: /

User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

Sitemap: ${siteOrigin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// ── Marketing domain robots.txt ───────────────────────────────────────────────

function marketingDomainRobots(): Response {
  const body = `User-agent: *
Allow: /

Disallow: /dashboard/
Disallow: /login
Disallow: /signup
Disallow: /verify
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /confirm-subscription
Disallow: /onboarding
Disallow: /internal/
Disallow: /api/
Disallow: /_next/

User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

Sitemap: ${MARKETING_ORIGIN}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Vary": "Host",
    },
  });
}

// ── UGC domain robots.txt ─────────────────────────────────────────────────────

function ugcDomainRobots(): Response {
  const body = `User-agent: *
Allow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

Sitemap: ${UGC_ORIGIN}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (!isInternalHost(tenantHost, runtimeHosts)) {
    return customDomainRobots(tenantHost);
  }

  if (tenantHost.toLowerCase() === "articurls.site") {
    return ugcDomainRobots();
  }

  if (tenantHost.toLowerCase().startsWith("app.articurls.com")) {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "Vary": "Host",
      },
    });
  }

  return marketingDomainRobots();
}
