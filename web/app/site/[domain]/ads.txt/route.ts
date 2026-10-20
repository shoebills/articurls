import { NextRequest } from "next/server";
import { resolveTenantSeo } from "@/lib/tenant-seo";

export const dynamic = "force-dynamic";

function notFoundResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
): Promise<Response> {
  const { domain } = await params;
  const host = decodeURIComponent(domain);

  const ctx = await resolveTenantSeo(host, req.headers.get("x-articurls-basepath"));
  if (!ctx) return notFoundResponse();

  const publisherId = (ctx.site.adsense_publisher_id || "").trim();
  if (!publisherId) return notFoundResponse();

  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}