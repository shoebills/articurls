import type { PublicSite } from "@/lib/types";
import { formatWithBasePath, getPublicProfileUrl } from "@/lib/public-url";

export function resolveSiteName(site: PublicSite | null | undefined): string {
  return (site?.site_name || "").trim() || site?.subdomain || "My Blog";
}

export function resolveLogoHref(
  site: PublicSite | null | undefined,
  subdomain: string,
  basePath = "",
): string {
  const raw = (site?.logo_link || "").trim();
  if (!raw) {
    return getPublicProfileUrl(subdomain, basePath);
  }
  return raw.startsWith("/") ? formatWithBasePath(raw, basePath) : raw;
}

export function withTrailingSlash(url: string, enabled: boolean): string {
  if (!enabled || url.endsWith("/")) return url;
  return `${url}/`;
}

export function withJsonLdSlash(url: string, site?: PublicSite | null): string {
  return withTrailingSlash(url, site?.seo_trailing_slash_jsonld === true);
}