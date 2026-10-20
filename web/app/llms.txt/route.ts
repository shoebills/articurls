/**
 * Platform llms.txt — describes Articurls itself on articurls.com. Tenant
 * llms.txt lives under /site/[domain]/llms.txt and is reached via the proxy
 * rewrite.
 */

import { NextRequest, NextResponse } from "next/server";
import { MARKETING_ORIGIN } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";

export const dynamic = "force-dynamic";

function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Vary": "Host",
    },
  });
}

function marketingDomainLlms(): Response {
  const body = `# Articurls
> The SEO-native blogging platform for brands and creators.

- [Home](${MARKETING_ORIGIN}/)
- [Pricing](${MARKETING_ORIGIN}/#pricing)
- [Features](${MARKETING_ORIGIN}/#features)
- [About](${MARKETING_ORIGIN}/about)
- [Contact](${MARKETING_ORIGIN}/contact)
- [Terms](${MARKETING_ORIGIN}/terms)
- [Privacy](${MARKETING_ORIGIN}/privacy)
- [Sitemap](${MARKETING_ORIGIN}/sitemap.xml)
`;
  return textResponse(body);
}

export async function GET(req: NextRequest): Promise<Response> {
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (tenantHost.toLowerCase().startsWith("app.articurls.com")) {
    return new NextResponse(null, { status: 404 });
  }

  return marketingDomainLlms();
}