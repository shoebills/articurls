import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

function resolveUsernameParam(params: Record<string, string | string[] | undefined>): string | null {
  const direct = params.username;
  if (typeof direct === "string" && direct.trim()) return direct;

  // Fallback for typed-route edge cases with dotted segment names.
  const firstString = Object.values(params).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? null;
}

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const routeParams = await params;
  const username = resolveUsernameParam(routeParams);
  if (!username) return new NextResponse(null, { status: 404 });

  const redirectUrl = new URL(`/sitemaps/${encodeURIComponent(username)}/sitemap.xml`, _req.url);
  return NextResponse.redirect(redirectUrl, 308);
}
