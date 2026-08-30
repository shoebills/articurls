import Script from "next/script";
import { buildUmamiDomains } from "@/lib/umami-domains";
import { isUmamiProxyConfigured } from "@/lib/umami-server";
import { APP_ORIGIN } from "@/lib/env";
import type { PublicSite } from "@/lib/types";

/** First-party Umami pageview tracker (Plan B — all public tenants). Server component only. */
export function UmamiTracker({ site }: { site: PublicSite }) {
  if (!isUmamiProxyConfigured()) return null;

  const websiteId = site.umami_website_id?.trim();
  if (!websiteId) return null;

  const domains = buildUmamiDomains(site);
  if (!domains) return null;
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
        src="/script.js"
        strategy="afterInteractive"
        data-website-id={websiteId}
        data-domains={domains}
        data-before-send="__articurlsUmamiBeforeSend"
      />
    </>
  );
}
