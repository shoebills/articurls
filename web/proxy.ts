import { NextResponse, type NextRequest } from "next/server";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHost,
  withTenantHostHeader,
} from "@/lib/request-host";

function getApiHost(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return "";
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return "";
  }
}

/** Add security headers to responses serving HTML content */
function withSecurityHeaders(response: NextResponse): NextResponse {
  const apiHost = getApiHost();
  const connectSrc = apiHost ? `'self' https://${apiHost}` : "'self'";

  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' https: data: blob:; " +
      "font-src 'self'; " +
      `connect-src ${connectSrc} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googlesyndication.com https://pagead2.googlesyndication.com https://*.doubleclick.net; ` +
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://googleads.g.doubleclick.net; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

/** Add cache headers with a tenant-scoped Cache-Tag for multi-tenant purging */
function withCacheHeaders(
  response: NextResponse,
  host: string,
  pathname: string
): NextResponse {
  // Only cache public content (not auth/dashboard/internal)
  const isPublicContent =
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/setup") &&
    !pathname.startsWith("/verify") &&
    !pathname.startsWith("/forgot-password") &&
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/internal");

  if (!isPublicContent) return response;

  // Single tenant-scoped edge tag; the backend purges with revalidateTag on
  // `tenant-{host}`, so granular tags here would never be invalidated.
  const tags: string[] = [`tenant-${host}`];

  // Set cache tags for targeted purging via backend (Vercel API + Next.js revalidateTag).
  response.headers.set("Vercel-Cache-Tag", tags.join(","));

  // Cache public blog content at the edge; purge via revalidateTag on content change.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=3600",
  );

  return response;
}

const APP_ALLOWED_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/setup",
  "/verify",
  "/forgot-password",
  "/reset-password",
];

const EXEMPT_PREFIXES = ["/_next", "/api"];
const SHARED_EXACT = ["/favicon.ico", "/vitals.js", "/site-vitals", "/datamaps.world.json"];

// Tenant-specific SEO/feed files, rewritten to /site/[domain]/<file> with the
// original path prefix passed via x-articurls-basepath for subpath validation.
const TENANT_SEO_FILES = new Set([
  "robots.txt",
  "ads.txt",
  "sitemap.xml",
  "llms.txt",
  "rss.xml",
  "atom.xml",
  "feed.xml",
  "feed.atom",
]);

function isSharedPath(pathname: string): boolean {
  return SHARED_EXACT.includes(pathname) || EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "");
  const marketingOrigin = process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "");

  if (!appOrigin || !marketingOrigin) return NextResponse.next();

  const runtimeHosts = buildRuntimeHostsFromEnv();
  const host = resolveTenantHost(
    request.headers,
    request.nextUrl.hostname,
    runtimeHosts,
  );

  const { pathname } = request.nextUrl;

  if (pathname !== "/" && pathname.endsWith("/")) {
    const cleanPath = pathname.slice(0, -1);
    const location = `${cleanPath}${request.nextUrl.search}`;
    return new NextResponse(null, {
      status: 308,
      headers: { Location: location },
    });
  }

  if (request.nextUrl.searchParams.size > 0) {
    const isPublicContent =
      !pathname.startsWith("/dashboard") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/signup") &&
      !pathname.startsWith("/setup") &&
      !pathname.startsWith("/verify") &&
      !pathname.startsWith("/forgot-password") &&
      !pathname.startsWith("/reset-password") &&
      !pathname.startsWith("/internal") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/_next");

    if (isPublicContent) {
      return new NextResponse(null, {
        status: 301,
        headers: { Location: pathname },
      });
    }
  }

  // Custom domain — CF SaaS preserves Host; legacy Worker used x-original-host.
  if (!isInternalHost(host, runtimeHosts)) {
    const tenantHeaders = withTenantHostHeader(request.headers, host);

    if (isSharedPath(pathname)) {
      return NextResponse.next({
        request: { headers: tenantHeaders },
      });
    }

    const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "";

    // Subpath-prefixed first-party analytics endpoints (e.g. /blog/vitals.js,
    // /blog/site-vitals): rewrite to the root route handlers.
    if (last === "vitals.js" || last === "site-vitals") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/${last}`;
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: tenantHeaders },
      });
    }

    // Tenant SEO/feed files: rewrite to /site/[domain]/<file>, passing the
    // requested prefix so the handler can validate it against the subpath.
    if (last && TENANT_SEO_FILES.has(last)) {
      const prefix = segments.slice(0, -1).join("/");
      const headers = new Headers(tenantHeaders);
      headers.set("x-articurls-basepath", prefix ? `/${prefix}` : "");
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/site/${encodeURIComponent(host)}/${last}`;
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers },
      });
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      segments.length === 0
        ? `/site/${encodeURIComponent(host)}`
        : `/site/${encodeURIComponent(host)}/${segments.join("/")}`;

    const response = withCacheHeaders(
      withSecurityHeaders(NextResponse.rewrite(rewriteUrl, {
        request: { headers: tenantHeaders },
      })),
      host,
      pathname
    );
    response.headers.set(
      "Link",
      '</llms.txt>; rel="describedby"; type="text/markdown"'
    );
    return response;
  }

  // Marketing domain — marketing pages only (user content lives on tenant hosts).
  let appHost = "";
  try {
    appHost = new URL(appOrigin).hostname;
  } catch {
    return NextResponse.next();
  }

  if (host !== appHost) {
    const segments = pathname === "/" ? [] : pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "";

    if (segments.length >= 2 && (last === "vitals.js" || last === "site-vitals")) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = `/${last}`;
      return NextResponse.rewrite(rewriteUrl);
    }

    let nextResponse = NextResponse.next();
    if (segments.length >= 2 && last && TENANT_SEO_FILES.has(last)) {
      const prefix = segments.slice(0, -1).join("/");
      const headers = new Headers(request.headers);
      headers.set("x-articurls-basepath", `/${prefix}`);
      nextResponse = NextResponse.next({ request: { headers } });
    }

    return withCacheHeaders(
      withSecurityHeaders(nextResponse),
      host,
      pathname
    );
  }

  // App domain — dashboard/auth only; redirect public paths to marketing.
  if (isSharedPath(pathname)) return NextResponse.next();

  const allowedOnAppHost = APP_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (allowedOnAppHost) return withSecurityHeaders(NextResponse.next());

  const url = new URL(pathname, marketingOrigin);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/:path*",
};
