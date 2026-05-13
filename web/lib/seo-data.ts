/**
 * Data fetchers for SEO routes (sitemap / robots.txt).
 *
 * Each function calls the same public API endpoint used by the
 * rendering pages — the backend already applies the correct filters:
 *
 *   blogs      → published only (no drafts / archived / scheduled)
 *   pages      → show_in_footer only (hidden pages excluded)
 *   categories → show_in_menu only (hidden categories excluded)
 */

import { API_URL } from "@/lib/env";
import type { PublicBlog, UserPage, Category } from "@/lib/types";

// ── Blogs ────────────────────────────────────────────────────────────────────

/**
 * Fetch all published blog posts for a user.
 * The backend already filters to `status == "published"`.
 */
export async function fetchPublishedPosts(
  username: string
): Promise<PublicBlog[]> {
  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(username)}/blogs`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Pages ────────────────────────────────────────────────────────────────────

/**
 * Fetch visible pages for a user.
 * The backend already filters to `show_in_footer === true`.
 */
export async function fetchPages(username: string): Promise<UserPage[]> {
  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(username)}/pages`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Categories ───────────────────────────────────────────────────────────────

/**
 * Fetch visible categories for a user.
 * The backend already filters to `show_in_menu === true`.
 */
export async function fetchCategories(username: string): Promise<Category[]> {
  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(username)}/categories`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Internal SEO eligibility ──────────────────────────────────────────────────

export interface SeoEligibility {
  is_pro: boolean;
  can_index_on_marketing: boolean;
}

/**
 * Fetch server-side SEO eligibility for a user.
 * This endpoint is internal and requires INTERNAL_API_SECRET.
 */
export async function fetchSeoEligibility(
  username: string
): Promise<SeoEligibility | null> {
  try {
    const res = await fetch(
      `${API_URL}/internal/user-seo-eligibility?username=${encodeURIComponent(username)}`,
      {
        cache: "no-store",
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as SeoEligibility;
  } catch {
    return null;
  }
}
