/**
 * URL helpers for public blog and profile pages.
 * 
 * These generate RELATIVE URLs that work automatically on both:
 * - articurls.com/[username] (path-based routing)
 * - custom domains (domain-based routing)
 * 
 * DO NOT include domain or username prefix in these helpers.
 */

export function getPublicPostUrl(username: string, slug: string): string {
  return `/blog/${slug}`;
}

export function getPublicProfileUrl(): string {
  return `/`;
}

export function getPublicCategoryUrl(slug: string): string {
  return `/category/${slug}`;
}
