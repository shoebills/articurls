export function formatWithBasePath(path: string, basePath = ""): string {
  const cleanBase = (basePath || "").trim().replace(/\/+$/, "");
  if (!cleanBase) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const result = `${cleanBase}${cleanPath === "/" ? "" : cleanPath}`;
  return result || "/";
}

export function getPublicPostUrl(_username: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/blog/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicProfileUrl(_username: string, basePath = ""): string {
  return formatWithBasePath("/", basePath) || "/";
}

export function getPublicCategoryUrl(_username: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/category/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicCategoriesUrl(_username: string, basePath = ""): string {
  return formatWithBasePath("/categories", basePath);
}

export function getPublicAuthorUrl(_username: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/author/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicAuthorsUrl(_username: string, basePath = ""): string {
  return formatWithBasePath("/authors", basePath);
}

export function getPublicPageUrl(_username: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/page/${encodeURIComponent(slug)}`, basePath);
}
