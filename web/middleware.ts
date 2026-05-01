import { NextResponse, type NextRequest } from "next/server";

const APP_ALLOWED_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/verify",
  "/forgot-password",
  "/reset-password",
];

const EXEMPT_PREFIXES = ["/_next", "/api"];
const EXEMPT_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_EXACT.includes(pathname) || EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "");

  if (!appOrigin || !marketingOrigin) return NextResponse.next();

  let appHost = "";
  try {
    appHost = new URL(appOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  const host = request.nextUrl.hostname;

  let marketingHost = "";
  try {
    marketingHost = new URL(marketingOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  if (host !== appHost && host !== marketingHost) {
    const { pathname, search } = request.nextUrl;
    if (isExemptPath(pathname)) return NextResponse.next();
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/custom-domain${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (host !== appHost) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isExemptPath(pathname)) return NextResponse.next();

  const allowedOnAppHost = APP_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (allowedOnAppHost) return NextResponse.next();

  return NextResponse.redirect(`${marketingOrigin}${pathname}${search}`);
}

export const config = {
  matcher: "/:path*",
};
