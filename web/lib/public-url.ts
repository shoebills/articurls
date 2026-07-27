export function getPublicPostUrl(username: string, slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}

export function getPublicProfileUrl(_username: string): string {
  return "/";
}

export function getPublicCategoryUrl(username: string, slug: string): string {
  return `/category/${encodeURIComponent(slug)}`;
}

export function getPublicPageUrl(username: string, slug: string): string {
  return `/page/${encodeURIComponent(slug)}`;
}
