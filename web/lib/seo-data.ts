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

export interface RssItem {
  title: string;
  link: string;
  guid: string;
  pubDate?: string | null;
  description?: string | null;
}

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

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toRfc822Date(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toUTCString();
}

/**
 * Build an RSS 2.0 feed document.
 */
export function buildRssXml(input: {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string | null;
  items: RssItem[];
}): string {
  const language = input.language || "en-US";
  const lastBuildDate =
    toRfc822Date(input.lastBuildDate) || new Date().toUTCString();

  const itemsXml = input.items
    .map((item) => {
      const parts = [
        `    <title>${escapeXml(item.title)}</title>`,
        `    <link>${escapeXml(item.link)}</link>`,
        `    <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
      ];
      const pubDate = toRfc822Date(item.pubDate);
      if (pubDate) parts.push(`    <pubDate>${escapeXml(pubDate)}</pubDate>`);
      const description = (item.description || "").trim();
      if (description) parts.push(`    <description>${escapeXml(description)}</description>`);
      return `  <item>\n${parts.join("\n")}\n  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>${escapeXml(input.title)}</title>\n  <link>${escapeXml(input.link)}</link>\n  <description>${escapeXml(input.description)}</description>\n  <language>${escapeXml(language)}</language>\n  <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>\n${itemsXml}\n</channel>\n</rss>`;
}
