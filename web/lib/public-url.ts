type PublicUrlOptions = {
  customDomain?: boolean;
};

function basePath(username: string, options?: PublicUrlOptions): string {
  if (options?.customDomain) return "";
  return `/${encodeURIComponent(username)}`;
}

export function getPublicPostUrl(username: string, slug: string, options?: PublicUrlOptions): string {
  return `${basePath(username, options)}/blog/${encodeURIComponent(slug)}`;
}

export function getPublicProfileUrl(username: string, options?: PublicUrlOptions): string {
  return basePath(username, options) || "/";
}

export function getPublicCategoryUrl(username: string, slug: string, options?: PublicUrlOptions): string {
  return `${basePath(username, options)}/category/${encodeURIComponent(slug)}`;
}

export function getPublicPageUrl(username: string, slug: string, options?: PublicUrlOptions): string {
  return `${basePath(username, options)}/page/${encodeURIComponent(slug)}`;
}
