import { NextRequest, NextResponse } from "next/server";
import { isMainHost } from "@/lib/hosts";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/custom-domain") ||
    pathname.startsWith("/api") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  if (!isMainHost(host)) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/custom-domain${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
