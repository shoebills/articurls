import type { Metadata } from "next";
import { assetUrl } from "@/lib/env";
import type { PublicSite } from "@/lib/types";

/**
 * Platform default favicon hosted on R2.
 * Set NEXT_PUBLIC_DEFAULT_FAVICON_URL in env to point at favicons/favicon.ico in R2.
 * Falls back to empty string in local dev (no favicon tag rendered).
 */
const DEFAULT_FAVICON_URL =
  process.env.NEXT_PUBLIC_DEFAULT_FAVICON_URL?.trim() || "";

/**
 * Build the `icons` object for Next.js `generateMetadata()`.
 *
 * - Pro users with a custom favicon → their uploaded image
 * - Everyone else → platform favicon from R2 (NEXT_PUBLIC_DEFAULT_FAVICON_URL)
 *
 * app/favicon.ico has been deleted from the repo so Next.js no longer
 * auto-injects a competing <link rel="icon"> tag. This function has
 * full control over what favicon appears on all public blog pages.
 */
export function faviconIcons(site: PublicSite | null | undefined): Metadata["icons"] {
  const url = site?.favicon_url ? assetUrl(site.favicon_url) : DEFAULT_FAVICON_URL;

  if (!url) {
    // Local dev with no env var set — browser uses its own default
    return undefined;
  }

  return {
    shortcut: url,
    icon: url,
    apple: url,
  };
}
