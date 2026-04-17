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

/** True when env points at this machine (links must stay same-origin for phone-on-LAN dev). */
function isLocalAppOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Login / signup hrefs: same-origin path when `NEXT_PUBLIC_APP_ORIGIN` is unset or localhost,
 * otherwise absolute URL to the configured app host (split marketing vs app in production).
 */
export function appAuthHref(pathWithQuery: string): string {
  const raw = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, "") || "";
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  if (!raw || isLocalAppOrigin(raw)) return path;
  return `${raw}${path}`;
}

export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
