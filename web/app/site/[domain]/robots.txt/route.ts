import { NextRequest, NextResponse } from "next/server";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicSite } from "@/lib/public-site";
import { normalizeSubpath } from "@/lib/tenant-seo";

export const dynamic = "force-dynamic";

const DISALLOW_ALL = "User-agent: *\nDisallow: /\n";

function textResponse(body: string, cacheControl = "public, max-age=300"): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": cacheControl,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
): Promise<Response> {
  const { domain } = await params;
  const host = decodeURIComponent(domain);

  const domainInfo = await resolveDomainForSeo(host);
  if (!domainInfo) return textResponse(DISALLOW_ALL);

  // Root-only file: the requested prefix must match the configured subpath
  // (empty for apex domains, the subpath for subfolder publications).
  if (normalizeSubpath(req.headers.get("x-articurls-basepath")) !== normalizeSubpath(domainInfo.custom_subpath)) {
    return new NextResponse(null, { status: 404 });
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return textResponse(DISALLOW_ALL);
  }
  if (domainInfo.redirect_to) return textResponse(DISALLOW_ALL);

  const site = await loadPublicSite(domainInfo.subdomain);
  if (!site) return textResponse(DISALLOW_ALL);
  if (site.seo_indexing_enabled === false) return textResponse(DISALLOW_ALL);

  if (site.seo_robots_mode === "custom" && (site.seo_robots_custom || "").trim()) {
    return textResponse(site.seo_robots_custom!);
  }

  const basePath = normalizeSubpath(domainInfo.custom_subpath);
  const siteOrigin = `https://${host}${basePath ? `/${basePath}` : ""}`;
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

  return textResponse(body);
}