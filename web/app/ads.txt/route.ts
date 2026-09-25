/**
 * Per-tenant ads.txt — serves custom domains and UGC subdomains.
 *
 * The middleware exempts /ads.txt from the custom-domain rewrite, so ALL
 * requests for /ads.txt land here. resolveTenantHost() reads Host (CF SaaS)
 * or x-original-host (legacy Worker). Only sites with an AdSense publisher ID
 * configured get a file; everything else (including platform hosts) is 404,
 * which Google treats as "no ads.txt".
 */

import { NextRequest } from "next/server";
import { API_URL } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromRequest,
} from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import type { PublicSite } from "@/lib/types";

export const dynamic = "force-dynamic";

function adsTxtBody(publisherId: string): string {
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}

function notFoundResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "public, max-age=300",
      "Vary": "x-original-host",
    },
  });
}

function adsTxtResponse(publisherId: string): Response {
  return new Response(adsTxtBody(publisherId), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Vary": "x-original-host",
    },
  });
}

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

export async function GET(req: NextRequest): Promise<Response> {
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const tenantHost = resolveTenantHostFromRequest(req, runtimeHosts);

  if (isInternalHost(tenantHost, runtimeHosts)) {
    return notFoundResponse();
  }

  const domainInfo = await resolveDomainForSeo(tenantHost);
  if (!domainInfo) return notFoundResponse();
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return notFoundResponse();
  }
  if (domainInfo.redirect_to) return notFoundResponse();

  const site = await loadSite(domainInfo.subdomain);
  const publisherId = (site?.adsense_publisher_id || "").trim();
  if (!publisherId) return notFoundResponse();

  return adsTxtResponse(publisherId);
}