import Script from "next/script";
import type { PublicSite } from "@/lib/types";

/** Google Analytics + AdSense tags for public tenant pages. Server component only. */
export function GoogleIntegrations({ site }: { site: PublicSite }) {
  const gaId = site.ga_measurement_id?.trim();
  const publisherId = site.adsense_publisher_id?.trim();

  return (
    <>
      {gaId ? (
        <>
          <Script
            id="articurls-google-tag"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
            async
          />
          <Script id="articurls-google-tag-config" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId}');`}
          </Script>
        </>
      ) : null}
      {publisherId ? (
        <Script
          id="articurls-adsense"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${publisherId}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
          async
        />
      ) : null}
    </>
  );
}