/**
 * Unified robots.txt handler — serves both articurls.com and custom domains.
 *
 * The middleware exempts /robots.txt from the custom-domain rewrite, so ALL
 * requests for /robots.txt — whether from articurls.com or blog.example.com —
 * land here. The x-original-host header (set by middleware for custom domains)
 * is used to distinguish the two cases.
 *
 * ── Custom domain request (x-original-host is a non-internal hostname) ──────
 *   - active / grace  → Allow all, sitemap points to custom domain.
 *   - pending         → Disallow all (not verified yet).
 *   - expired         → Disallow all (content redirects to articurls).
 *   - unknown host    → Disallow all (safe default).
 *   - robots_mode = "custom" → appends user's robots_custom_rules.
 *
 * ── Marketing domain request (no x-original-host, or internal hostname) ─────
 *   - Blocks dashboard, auth, and internal routes.
 *   - Allows all public user content.
 *   - Canonical tags + 301 redirects handle consolidation for custom domain
 *     users; no Disallow needed for their articurls URLs.
 */

import { NextRequest } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";

export const dynamic = "force-dynamic";

// ── Internal domain list (mirrors middleware.ts) ──────────────────────────────

const INTERNAL_HOSTNAMES = new Set([
  "articurls.com",
  "app.articurls.com",
  "api.articurls.com",
  "blogs.articurls.com",
  "fallback.articurls.com",
]);

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (INTERNAL_HOSTNAMES.has(h)) return true;
  return h === "localhost" || h.startsWith("localhost:") || h === "127.0.0.1";
}

const DISALLOW_ALL = "User-agent: *\nDisallow: /\n";

// ── Domain resolution ─────────────────────────────────────────────────────────

async function resolveDomainInfo(
  host: string,
): Promise<{ username: string; domain_status: string } | null> {
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        cache: "no-store",
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function loadUser(username: string) {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Custom domain robots.txt ──────────────────────────────────────────────────

async function customDomainRobots(host: string): Promise<Response> {
  const domainInfo = await resolveDomainInfo(host);

  if (!domainInfo) {
    return new Response(DISALLOW_ALL, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { domain_status, username } = domainInfo;

  // pending → not verified, prevent indexing
  // expired → content redirects to articurls, prevent indexing here
  if (domain_status === "pending" || domain_status === "expired") {
    return new Response(DISALLOW_ALL, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (domain_status !== "active" && domain_status !== "grace") {
    return new Response(DISALLOW_ALL, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const user = await loadUser(username);

  if (!user) {
    return new Response(DISALLOW_ALL, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const siteOrigin = `https://${host}`;
  let body = `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`;

  // Append custom rules when user has opted in
  if (user.robots_mode === "custom" && user.robots_custom_rules?.trim()) {
    body += `\n# Custom rules\n${user.robots_custom_rules.trim()}\n`;
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

// ── Marketing domain robots.txt ───────────────────────────────────────────────

function marketingDomainRobots(): Response {
  const body = `User-agent: *
# Dashboard and auth — never index
Disallow: /dashboard/
Disallow: /login
Disallow: /signup
Disallow: /verify
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /confirm-subscription
Disallow: /internal/

# API prefix
Disallow: /api/

Allow: /

Sitemap: ${MARKETING_ORIGIN}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const originalHost = req.headers.get("x-original-host");

  if (originalHost && !isInternalHost(originalHost)) {
    return customDomainRobots(originalHost);
  }

  return marketingDomainRobots();
}
