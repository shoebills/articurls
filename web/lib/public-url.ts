import type { SiteSummary } from "@/lib/types";
import { UGC_DOMAIN } from "@/lib/env";

export function formatWithBasePath(path: string, basePath = ""): string {
  const cleanBase = (basePath || "").trim().replace(/\/+$/, "");
  if (!cleanBase) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const result = `${cleanBase}${cleanPath === "/" ? "" : cleanPath}`;
  return result || "/";
}

export function getPublicPostUrl(_subdomain: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/blog/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicProfileUrl(_subdomain: string, basePath = ""): string {
  return formatWithBasePath("/", basePath) || "/";
}

export function getPublicCategoryUrl(_subdomain: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/category/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicCategoriesUrl(_subdomain: string, basePath = ""): string {
  return formatWithBasePath("/categories", basePath);
}

export function getPublicAuthorUrl(_subdomain: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/author/${encodeURIComponent(slug)}`, basePath);
}

export function getPublicAuthorsUrl(_subdomain: string, basePath = ""): string {
  return formatWithBasePath("/authors", basePath);
}

export function getPublicPageUrl(_subdomain: string, slug: string, basePath = ""): string {
  return formatWithBasePath(`/page/${encodeURIComponent(slug)}`, basePath);
}

function hasActiveDomain(site: Pick<SiteSummary, "custom_domain" | "domain_status">): boolean {
  return !!(
    site.custom_domain &&
    (site.domain_status === "active" || site.domain_status === "grace")
  );
}

/** Root URL of a site's public blog: custom domain (+ subpath when set) or subdomain.articurls.site */
export function getSitePublicRoot(site: SiteSummary | null | undefined): string | null {
  if (!site) return null;
  if (hasActiveDomain(site)) {
    const subpath = site.custom_subpath
      ? `/${site.custom_subpath.replace(/^\/+/, "").replace(/\/+$/, "")}`
      : "";
    return `https://${site.custom_domain}${subpath}`;
  }
  return `https://${encodeURIComponent(site.subdomain)}.${UGC_DOMAIN}`;
}

/** Absolute URL for a site-relative path (e.g. "/blog/my-post"), scoped to the given site. */
export function getSitePublicUrl(
  site: SiteSummary | null | undefined,
  path: string,
): string | null {
  const root = getSitePublicRoot(site);
  if (!root) return null;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${root}${cleanPath}`;
}
