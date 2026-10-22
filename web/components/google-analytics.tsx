/** Articurls' own GA4 tag for the marketing site and dashboard. */
const GA_MEASUREMENT_ID = "G-WC5XPV34JT";

export function GoogleAnalytics() {
  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        id="articurls-google-tag-config"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${GA_MEASUREMENT_ID}');`,
        }}
      />
    </>
  );
}
