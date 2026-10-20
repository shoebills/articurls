/**
 * Platform robots.txt — serves articurls.com (marketing), app.articurls.com,
 * and articurls.site (UGC landing). Tenant robots.txt lives under
 * /site/[domain]/robots.txt and is reached via the proxy rewrite.
 */

import { NextRequest } from "next/server";
import { MARKETING_ORIGIN, UGC_DOMAIN, UGC_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";

export const dynamic = "force-dynamic";

const DISALLOW_ALL = "User-agent: *\nDisallow: /\n";

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
Disallow: /setup
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

  if (tenantHost.toLowerCase() === UGC_DOMAIN) {
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