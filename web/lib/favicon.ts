import type { Metadata } from "next";
import { assetUrl } from "@/lib/env";
import type { PublicUser } from "@/lib/types";

/**
 * Build the `icons` object for Next.js `generateMetadata()`.
 *
 * - Pro users with a custom favicon → their uploaded image
 * - Everyone else → platform default (Articurls favicon)
 */
export function faviconIcons(user: PublicUser | null | undefined): Metadata["icons"] {
  const url = user?.favicon_url ? assetUrl(user.favicon_url) : "/favicon.ico";
  return { icon: url, apple: url };
}
