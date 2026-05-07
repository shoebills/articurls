import type { Metadata } from "next";
import { assetUrl } from "@/lib/env";
import type { PublicUser } from "@/lib/types";

/**
 * Build the `icons` object for Next.js `generateMetadata()`.
 *
 * - Pro users with a custom favicon → their uploaded image only
 * - Everyone else → platform default (Articurls favicon)
 *
 * When a custom favicon is set we set `shortcut` to the custom URL so
 * Next.js replaces the auto-injected favicon.ico shortcut link rather than
 * appending alongside it. Without this, Chrome picks the favicon.ico
 * (which has explicit sizes="256x256") over the custom PNG.
 */
export function faviconIcons(user: PublicUser | null | undefined): Metadata["icons"] {
  if (!user?.favicon_url) {
    return { icon: "/favicon.ico", apple: "/favicon.ico" };
  }

  const url = assetUrl(user.favicon_url);
  return {
    // shortcut replaces the <link rel="shortcut icon"> Next.js injects from
    // app/favicon.ico, preventing it from competing with the custom icon
    shortcut: url,
    icon: url,
    apple: url,
  };
}
