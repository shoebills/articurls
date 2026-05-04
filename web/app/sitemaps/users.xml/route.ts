/**
 * User sitemap index — Level 2 of layered sitemap architecture.
 * 
 * Returns a sitemap index listing all per-user sitemaps for users without
 * active custom domains (domain_status NOT IN ['active', 'grace']).
 * 
 * Uses cursor-based pagination to fetch all eligible users without limits.
 * 
 * This route is referenced by the root sitemap at /sitemap.xml.
 * 
 * Fallback: If the API call fails or returns no users, returns a basic
 * sitemap with the homepage (not an empty sitemap index).
 */

import { NextRequest } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";

export const dynamic = "force-dynamic";

// ── XML builder for sitemap index ─────────────────────────────────────────────

function buildSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
  const items = sitemaps
    .map(({ loc, lastmod }) => {
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

function buildXml(
  entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[],
): string {
  const items = entries
    .map(({ loc, lastmod, changefreq, priority }) => {
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
      if (priority) parts.push(`    <priority>${priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`;
}

// ── Fetch all users with pagination ───────────────────────────────────────────

/**
 * Fetch all eligible users using cursor-based pagination.
 * 
 * Google sitemap limit: Maximum 50,000 URLs per sitemap file.
 * Reference: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
 * 
 * This function enforces the 50,000 entry limit and fetches ALL eligible users
 * without premature stopping. Completeness is prioritized over speed.
 * 
 * TODO: When users exceed 50,000:
 * - Split into multiple sitemap files: /sitemaps/users-1.xml, /sitemaps/users-2.xml, etc.
 * - Update root sitemap index to reference all user sitemap files
 * - Each file must contain ≤50,000 entries
 */
async function fetchAllEligibleUsers(): Promise<string[]> {
  const MAX_USERS = 50000; // Google's sitemap limit

  let cursor: number | null = null;
  let allUsernames: string[] = [];
  const seenCursors = new Set<number | null>();
  
  // Add initial null cursor to set
  seenCursors.add(null);

  try {
    while (true) {
      // Check if we've reached Google's limit
      const remainingSlots = MAX_USERS - allUsernames.length;
      if (remainingSlots <= 0) {
        console.warn(`Reached Google sitemap limit of ${MAX_USERS} users`);
        break;
      }

      // Build URL with cursor
      const url: string = cursor
        ? `${API_URL}/internal/users-for-sitemap?cursor=${cursor}`
        : `${API_URL}/internal/users-for-sitemap`;

      const res: Response = await fetch(url, {
        cache: "no-store",
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      });

      if (!res.ok) {
        console.error(`Failed to fetch users page: ${res.status}`);
        break;
      }

      const data: { usernames?: string[]; next_cursor?: number | null } = await res.json();
      const usernames: string[] = data.usernames || [];
      const nextCursor: number | null = data.next_cursor ?? null;

      // Add users, respecting the 50k limit
      const usersToAdd = usernames.slice(0, remainingSlots);
      allUsernames.push(...usersToAdd);

      // No more pages - natural end
      if (nextCursor === null) {
        break;
      }

      // Detect infinite loop (duplicate cursor)
      if (seenCursors.has(nextCursor)) {
        console.error(`Duplicate cursor detected: ${nextCursor}. Stopping pagination to prevent infinite loop.`);
        break;
      }

      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  } catch (error) {
    console.error("Error fetching users for sitemap:", error);
    // Return whatever we've collected so far
  }

  return allUsernames;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  try {
    // Fetch all eligible users using pagination
    const usernames = await fetchAllEligibleUsers();

    // If we have users, return sitemap index
    if (usernames.length > 0) {
      const sitemaps = usernames.map((username) => ({
        loc: `${MARKETING_ORIGIN}/${encodeURIComponent(username)}/sitemap.xml`,
        lastmod: today,
      }));

      return new Response(buildSitemapIndex(sitemaps), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      });
    }
  } catch (error) {
    // API call failed — fall through to fallback
    console.error("Failed to fetch users for sitemap:", error);
  }

  // Fallback: Return basic sitemap with homepage only (not empty sitemap index)
  const entries = [
    {
      loc: `${MARKETING_ORIGIN}/`,
      lastmod: today,
      changefreq: "daily",
      priority: "1.0",
    },
  ];

  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
