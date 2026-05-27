import { NextResponse, type NextRequest } from "next/server";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHost,
  withTenantHostHeader,
} from "@/lib/request-host";

/** Add security headers to responses serving HTML content */
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' https: data: blob:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://api.articurls.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

const APP_ALLOWED_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/onboarding",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/confirm-subscription",
];

const EXEMPT_PREFIXES = ["/_next", "/api"];
const EXEMPT_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml", "/rss.xml", "/script.js", "/manifest.json"];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_EXACT.includes(pathname) || EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "");

  if (!appOrigin || !marketingOrigin) return NextResponse.next();

  const runtimeHosts = buildRuntimeHostsFromEnv();
  const host = resolveTenantHost(
    request.headers,
    request.nextUrl.hostname,
    runtimeHosts,
  );

  const { pathname, search } = request.nextUrl;

  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }

  if (request.nextUrl.searchParams.size > 0) {
    const isPublicContent =
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/signup") &&
      !pathname.startsWith("/onboarding") &&
      !pathname.startsWith("/verify") &&
      !pathname.startsWith("/forgot-password") &&
      !pathname.startsWith("/reset-password") &&
      !pathname.startsWith("/confirm-subscription") &&
      !pathname.startsWith("/internal") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next");

    if (isPublicContent) {
      const url = request.nextUrl.clone();
      url.search = "";
      return NextResponse.redirect(url, 301);
    }
  }

  // Custom domain — CF SaaS preserves Host; legacy Worker used x-original-host.
  if (!isInternalHost(host, runtimeHosts)) {
    const tenantHeaders = withTenantHostHeader(request.headers, host);

    if (isExemptPath(pathname)) {
      return NextResponse.next({
        request: { headers: tenantHeaders },
      });
    }

    const rewriteUrl = request.nextUrl.clone();
    const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
    rewriteUrl.pathname =
      segments.length === 0 ? "/custom-domain" : `/custom-domain/${segments.join("/")}`;

    return withSecurityHeaders(NextResponse.rewrite(rewriteUrl, {
      request: { headers: tenantHeaders },
    }));
  }

  // Marketing domain — /[username], /[username]/blog/[slug], etc.
  let appHost = "";
  try {
    appHost = new URL(appOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  if (host !== appHost) return withSecurityHeaders(NextResponse.next());

  // App domain — dashboard/auth only; redirect public paths to marketing.
  if (isExemptPath(pathname)) return NextResponse.next();

  const allowedOnAppHost = APP_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (allowedOnAppHost) return withSecurityHeaders(NextResponse.next());

  return NextResponse.redirect(`${marketingOrigin}${pathname}${search}`);
}

export const config = {
  matcher: "/:path*",
};
