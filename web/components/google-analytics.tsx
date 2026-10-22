import Script from "next/script";
import { APP_ORIGIN, MARKETING_ORIGIN } from "@/lib/env";

/** Articurls' own GA4 tag for the marketing site and dashboard. */
const GA_MEASUREMENT_ID = "G-WC5XPV34JT";

function originHost(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const PLATFORM_HOSTS = Array.from(
  new Set(
    [originHost(MARKETING_ORIGIN), originHost(APP_ORIGIN)].filter(
      (host): host is string => host !== null,
    ),
  ),
);

export function GoogleAnalytics() {
  return (
    <Script id="articurls-platform-google-tag" strategy="afterInteractive">
      {`
        (function () {
          if (${JSON.stringify(PLATFORM_HOSTS)}.indexOf(window.location.hostname.toLowerCase()) === -1) return;
          if (document.getElementById("articurls-platform-gtag-js")) return;

          window.dataLayer = window.dataLayer || [];
          function gtag() { window.dataLayer.push(arguments); }
          gtag("js", new Date());
          gtag("config", "${GA_MEASUREMENT_ID}");

          var script = document.createElement("script");
          script.id = "articurls-platform-gtag-js";
          script.async = true;
          script.src = "https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}";
          document.head.appendChild(script);
        })();
      `}
    </Script>
  );
}
