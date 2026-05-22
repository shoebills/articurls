import Script from "next/script";
import { buildUmamiDomains } from "@/lib/umami-domains";
import { isUmamiProxyConfigured } from "@/lib/umami-server";
import type { PublicUser } from "@/lib/types";

/** First-party Umami pageview tracker (Plan B — all public tenants). Server component only. */
export function UmamiTracker({ user }: { user: PublicUser }) {
  if (!isUmamiProxyConfigured()) return null;

  const websiteId = user.umami_website_id?.trim();
  if (!websiteId) return null;

  const domains = buildUmamiDomains(user);
  if (!domains) return null;

  return (
    <Script
      src="/script.js"
      strategy="afterInteractive"
      data-website-id={websiteId}
      data-domains={domains}
    />
  );
}
