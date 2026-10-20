import Script from "next/script";
import { hasActiveCustomDomain } from "@/lib/custom-domain-redirect";
import { buildUmamiDomains } from "@/lib/umami-domains";
import { isUmamiProxyConfigured, UMAMI_SCRIPT_PATH } from "@/lib/umami-server";
import { APP_ORIGIN } from "@/lib/env";
import type { PublicSite } from "@/lib/types";

/** First-party Umami pageview tracker (Plan B — all public tenants). Server component only. */
export function UmamiTracker({
  site,
  customSubpath,
}: {
  site: PublicSite;
  customSubpath?: string | null;
}) {
  if (!isUmamiProxyConfigured()) return null;

  const websiteId = site.umami_website_id?.trim();
  if (!websiteId) return null;

  const domains = buildUmamiDomains(site);
  if (!domains) return null;

  const effectiveSubpath = customSubpath ?? site.custom_subpath;
  const rawSubpath = hasActiveCustomDomain(site)
    ? (effectiveSubpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "")
    : "";
  const basePath = rawSubpath ? `/${rawSubpath}` : "";
  const scriptSrc = `${basePath}${UMAMI_SCRIPT_PATH}`;

  const appHost = (() => {
    try {
      return new URL(APP_ORIGIN).hostname;
    } catch {
      return "";
    }
  })();

  return (
    <>
      <Script id="articurls-umami-before-send" strategy="afterInteractive">
        {`
          window.__articurlsUmamiBeforeSend = function(type, payload) {
            try {
              // One-time opt-out/opt-in handoff from the dashboard toggle: never
              // count the landing pageview that plants/removes the exclusion flag
              // (the tracker script may fire before the flag is written).
              var params = new URLSearchParams(window.location.search);
              if (params.has("exclude-me") || params.has("include-me")) {
                return false;
              }
              var referrer = document.referrer || "";
              var appHost = ${JSON.stringify(appHost)};
              if (referrer && appHost && new URL(referrer).hostname === appHost) {
                return false;
              }
            } catch (error) {}
            return payload;
          };
        `}
      </Script>
      <Script
        src={scriptSrc}
        strategy="afterInteractive"
        data-website-id={websiteId}
        data-domains={domains}
        data-host-url={basePath || undefined}
        data-before-send="__articurlsUmamiBeforeSend"
      />
    </>
  );
}
