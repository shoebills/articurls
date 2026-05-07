import type { Metadata } from "next";
import { assetUrl } from "@/lib/env";
import type { PublicUser } from "@/lib/types";

/**
 * Build the `icons` object for Next.js `generateMetadata()`.
 *
 * - Pro users with a custom favicon → their uploaded image
 * - Everyone else → platform default (Articurls favicon)
 *
 * When a custom favicon is set we return it as an array of icon descriptors
 * with explicit `sizes` and `type` so browsers prefer it over the root-layout
 * favicon.ico that Next.js injects automatically from app/favicon.ico.
 */
export function faviconIcons(user: PublicUser | null | undefined): Metadata["icons"] {
  if (!user?.favicon_url) {
    return { icon: "/favicon.ico", apple: "/favicon.ico" };
  }

  const url = assetUrl(user.favicon_url);
  return {
    icon: [
      // Explicit PNG entry wins over the auto-injected favicon.ico
      { url, type: "image/png", sizes: "any" },
    ],
    apple: url,
  };
}
