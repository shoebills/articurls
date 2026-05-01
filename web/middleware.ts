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

const STATIC_INTERNAL_DOMAINS = [
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

function isInternalDomain(host: string, extraHosts: string[]): boolean {
  const h = host.toLowerCase();
  return STATIC_INTERNAL_DOMAINS.includes(h) || extraHosts.includes(h);
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
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

  if (!appOrigin || !marketingOrigin) return NextResponse.next();

  // Derive runtime hosts from env so local dev (localhost:3000) is never
  // mistaken for a custom domain.
  const runtimeHosts: string[] = [];
  for (const origin of [appOrigin, marketingOrigin]) {
    try {
      runtimeHosts.push(new URL(origin).host); // host = hostname + optional port
    } catch {
      // ignore malformed env
    }
  }

  const host = request.nextUrl.hostname;
  const { pathname, search } = request.nextUrl;

  // CASE 1: Custom domain (not an internal or env-configured articurls host)
  if (!isInternalDomain(host, runtimeHosts)) {
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

  // CASE 2: Main marketing domain — allow all path-based routing untouched
  let appHost = "";
  try {
    appHost = new URL(appOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  if (host !== appHost) return NextResponse.next();

  // CASE 3: App domain (app.articurls.com / app host from env)
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
