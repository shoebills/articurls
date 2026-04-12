export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Marketing site origin (nav links, public blog URLs in copy) */
export const MARKETING_ORIGIN =
  process.env.NEXT_PUBLIC_MARKETING_ORIGIN?.replace(/\/$/, "") ||
  "https://articurls.com";

/** App origin (login, dashboard) */
export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN?.replace(/\/$/, "") ||
  "https://app.articurls.com";

export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
