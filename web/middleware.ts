import { NextResponse, type NextRequest } from "next/server";

const APP_HOST = "app.articurls.com";
const MARKETING_HOST = "articurls.com";

const APP_ALLOWED_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/confirm-subscription",
];

const EXEMPT_PREFIXES = ["/_next", "/api"];
const EXEMPT_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

const INTERNAL_DOMAINS = [
  "articurls.com",
  "app.articurls.com",
  "api.articurls.com",
  "blogs.articurls.com",
  "fallback.articurls.com",
  "origin.articurls.com",
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_EXACT.includes(pathname) || EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

function isInternalDomain(host: string): boolean {
  return INTERNAL_DOMAINS.includes(host.toLowerCase());
}

async function lookupCustomDomain(
  host: string,
  apiUrl: string
): Promise<{ username: string; domain_status: string } | null> {
  try {
    const url = `${apiUrl}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`;
    const res = await fetch(url, {
      headers: {
        "x-internal-secret": process.env.INTERNAL_API_SECRET || "",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") || `https://${MARKETING_HOST}`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

  const host = request.nextUrl.hostname;
  const { pathname, search } = request.nextUrl;

  // CASE 1: Custom domain (not an internal articurls domain)
  if (!isInternalDomain(host)) {
    if (isExemptPath(pathname)) return NextResponse.next();

    const domainInfo = await lookupCustomDomain(host, apiUrl);
    if (!domainInfo) return NextResponse.next();

    const { username, domain_status } = domainInfo;

    if (domain_status === "expired") {
      const redirectUrl = `${marketingOrigin}/${username}${pathname}${search}`;
      return NextResponse.redirect(redirectUrl, { status: 301 });
    }

    if (domain_status === "active" || domain_status === "grace") {
      const rewriteUrl = request.nextUrl.clone();
      const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
      rewriteUrl.pathname = `/custom-domain/${segments.join("/")}`;

      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set("x-username", username);
      response.headers.set("x-original-host", host);
      return response;
    }

    return NextResponse.next();
  }

  // CASE 2: Main marketing domain (articurls.com)
  // Allow normal routing: /[username], /[username]/blog/[slug], etc.
  if (host === MARKETING_HOST) {
    return NextResponse.next();
  }

  // CASE 3: App domain (app.articurls.com)
  // Dashboard, login, signup, etc.
  if (host === APP_HOST) {
    if (isExemptPath(pathname)) return NextResponse.next();

    const allowedOnAppHost = APP_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (allowedOnAppHost) return NextResponse.next();

    // Redirect non-dashboard paths to marketing domain
    return NextResponse.redirect(`${marketingOrigin}${pathname}${search}`);
  }

  // All other internal domains (api, blogs, fallback, origin) pass through
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
