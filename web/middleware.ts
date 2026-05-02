import { NextResponse, type NextRequest } from "next/server";

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
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_EXACT.includes(pathname) || EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

function buildRuntimeHosts(appOrigin: string, marketingOrigin: string): string[] {
  const hosts: string[] = [];
  for (const origin of [appOrigin, marketingOrigin]) {
    try {
      hosts.push(new URL(origin).hostname);
    } catch {
      // ignore malformed env
    }
  }
  return hosts;
}

function isInternalDomain(host: string, runtimeHosts: string[]): boolean {
  const h = host.toLowerCase();
  return STATIC_INTERNAL_DOMAINS.includes(h) || runtimeHosts.includes(h);
}

export function middleware(request: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "");

  if (!appOrigin || !marketingOrigin) return NextResponse.next();

  const runtimeHosts = buildRuntimeHosts(appOrigin, marketingOrigin);

  // request.nextUrl.hostname on Vercel is always the deployment domain
  // (blogs.articurls.com). The real public-facing hostname comes from
  // x-original-host which Cloudflare SaaS sets via a CF Worker, or from
  // x-forwarded-host. Fall back to nextUrl.hostname for direct Vercel hits.
  const rawHost =
    request.headers.get("x-original-host") ||
    request.headers.get("x-forwarded-host") ||
    request.nextUrl.hostname;
  const host = rawHost.toLowerCase().split(",")[0].trim();

  const { pathname, search } = request.nextUrl;

  // CASE 1: Custom domain — rewrite to /custom-domain route
  // Domain status check happens server-side in the /custom-domain page
  if (!isInternalDomain(host, runtimeHosts)) {
    if (isExemptPath(pathname)) return NextResponse.next();

    // Rewrite to /custom-domain route and pass hostname via header
    // The server-side page will handle domain lookup and lifecycle
    const rewriteUrl = request.nextUrl.clone();
    const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
    rewriteUrl.pathname = segments.length === 0 ? "/custom-domain" : `/custom-domain/${segments.join("/")}`;
    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: new Headers({
          ...Object.fromEntries(request.headers),
          "x-original-host": host,
        }),
      },
    });
  }

  // CASE 2: Marketing domain (articurls.com / localhost in dev)
  // Let all path-based routing work normally: /[username], /[username]/blog/[slug], etc.
  let appHost = "";
  try {
    appHost = new URL(appOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  if (host !== appHost) return NextResponse.next();

  // CASE 3: App domain (app.articurls.com)
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
