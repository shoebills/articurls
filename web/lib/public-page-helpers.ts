import type { PublicSite } from "@/lib/types";

export function resolveSiteName(site: PublicSite | null | undefined): string {
  return (site?.site_name || "").trim() || site?.subdomain || "My Blog";
}

export function withTrailingSlash(url: string, enabled: boolean): string {
  if (!enabled || url.endsWith("/")) return url;
  return `${url}/`;
}

export function withJsonLdSlash(url: string, site?: PublicSite | null): string {
  return withTrailingSlash(url, site?.seo_trailing_slash_jsonld === true);
}