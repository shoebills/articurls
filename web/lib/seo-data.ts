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
import type { PublicBlog, UserPage, Category, Author } from "@/lib/types";

export interface RssItem {
  title: string;
  link: string;
  guid: string;
  pubDate?: string | null;
  description?: string | null;
  authorName?: string | null;
  categoryNames?: string[];
  imageUrl?: string | null;
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
 */
export async function fetchCategories(username: string, all = false): Promise<Category[]> {
  try {
    const q = all ? "?all=true" : "";
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(username)}/categories${q}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ── Authors ──────────────────────────────────────────────────────────────────

/**
 * Fetch authors for a user.
 */
export async function fetchAuthors(username: string): Promise<Author[]> {
  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(username)}/authors`,
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

function toIsoDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
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
      if (item.authorName) {
        parts.push(`    <dc:creator>${escapeXml(item.authorName)}</dc:creator>`);
      }
      if (item.categoryNames && item.categoryNames.length > 0) {
        for (const cat of item.categoryNames) {
          parts.push(`    <category>${escapeXml(cat)}</category>`);
        }
      }
      if (item.imageUrl) {
        parts.push(`    <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" length="0" />`);
      }
      const pubDate = toRfc822Date(item.pubDate);
      if (pubDate) parts.push(`    <pubDate>${escapeXml(pubDate)}</pubDate>`);
      const description = (item.description || "").trim();
      if (description) parts.push(`    <description>${escapeXml(description)}</description>`);
      return `  <item>\n${parts.join("\n")}\n  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>${escapeXml(input.title)}</title>\n  <link>${escapeXml(input.link)}</link>\n  <description>${escapeXml(input.description)}</description>\n  <language>${escapeXml(language)}</language>\n  <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>\n  <atom:link href="${escapeXml(input.link)}/rss.xml" rel="self" type="application/rss+xml" />\n${itemsXml}\n</channel>\n</rss>`;
}

/**
 * Build an Atom 1.0 feed document.
 */
export function buildAtomXml(input: {
  title: string;
  link: string;
  description: string;
  authorName?: string;
  updated?: string | null;
  items: RssItem[];
}): string {
  const updatedIso = toIsoDate(input.updated);
  const feedAuthor = input.authorName || input.title;

  const entriesXml = input.items
    .map((item) => {
      const parts = [
        `    <title>${escapeXml(item.title)}</title>`,
        `    <link href="${escapeXml(item.link)}" />`,
        `    <id>${escapeXml(item.guid)}</id>`,
        `    <updated>${toIsoDate(item.pubDate)}</updated>`,
      ];
      if (item.authorName) {
        parts.push(`    <author><name>${escapeXml(item.authorName)}</name></author>`);
      }
      if (item.categoryNames && item.categoryNames.length > 0) {
        for (const cat of item.categoryNames) {
          parts.push(`    <category term="${escapeXml(cat)}" />`);
        }
      }
      if (item.imageUrl) {
        parts.push(`    <link rel="enclosure" href="${escapeXml(item.imageUrl)}" type="image/jpeg" />`);
      }
      const description = (item.description || "").trim();
      if (description) {
        parts.push(`    <summary type="text">${escapeXml(description)}</summary>`);
      }
      return `  <entry>\n${parts.join("\n")}\n  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${escapeXml(input.title)}</title>\n  <subtitle>${escapeXml(input.description)}</subtitle>\n  <link href="${escapeXml(input.link)}" />\n  <link href="${escapeXml(input.link)}/atom.xml" rel="self" type="application/atom+xml" />\n  <id>${escapeXml(input.link)}</id>\n  <updated>${updatedIso}</updated>\n  <author>\n    <name>${escapeXml(feedAuthor)}</name>\n  </author>\n${entriesXml}\n</feed>`;
}
