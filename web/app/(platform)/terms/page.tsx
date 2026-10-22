import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { MARKETING_ORIGIN } from "@/lib/env";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Articurls, including accounts, subscriptions, custom domains, and content.",
  alternates: { canonical: `${MARKETING_ORIGIN}/terms` },
};

const SUPPORT_EMAIL = "support@articurls.com";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Account and registration",
    body: (
      <>
        <p>
          To use Articurls you must create an account with accurate information and verify your
          email address within 14 days. Unverified accounts are deleted automatically. You are
          responsible for keeping your credentials secure and for all activity under your account.
        </p>
        <p>
          Each account claims a subdomain on <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">articurls.site</code>.
          Subdomains must be 3–48 characters of lowercase letters, numbers, or hyphens, may not use
          reserved platform names, and are permanent once claimed.
        </p>
      </>
    ),
  },
  {
    title: "2. Subscriptions, free trial, and traffic tiers",
    body: (
      <>
        <p>
          Pro subscriptions start with a <strong className="font-semibold text-foreground">7-day
          free trial</strong>. After the trial ends, editing features are limited until you choose a
          paid plan, though you can always access billing and support.
        </p>
        <p>
          Pro plans are priced by monthly traffic allowance, available on monthly or yearly cycles:
          10K, 50K, 100K, 250K, 500K, and Unlimited pageviews. Pageview usage is aggregated across
          all publications on your account and resets on the first of each calendar month.
        </p>
        <p>
          The Lifetime plan is a one-time purchase that includes Pro features and unlimited
          monthly pageviews. Lifetime accounts do not change tiers or renew.
        </p>
        <p>
          Plan changes are prorated. Upgrading or switching between monthly cycles applies
          immediately; switching from a yearly to a monthly cycle is scheduled to take effect at the
          end of the current yearly period.
        </p>
      </>
    ),
  },
  {
    title: "3. Billing, cancellation, refunds, and disputes",
    body: (
      <>
        <p>
          Payments are processed by DodoPayments. You may cancel at any time from your Billing
          dashboard or the DodoPayments customer portal, and you retain access through the end of
          your current billing period.
        </p>
        <p>
          A full refund or a chargeback resolved against you (a lost, accepted, or expired dispute)
          may result in the corresponding Pro or Lifetime access being revoked, including
          transitioning any active custom domains into a grace period as described below.
        </p>
      </>
    ),
  },
  {
    title: "4. Custom domains and the grace period",
    body: (
      <>
        <p>
          Custom domains — an apex domain, a subdomain, or subdirectory routing on a site you
          already run — require an active Pro or Lifetime subscription. Domains on{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">articurls.com</code> may
          not be used as custom domains.
        </p>
        <p>
          If a Pro subscription lapses, active custom domains enter a{" "}
          <strong className="font-semibold text-foreground">14-day grace period</strong> during
          which your blog keeps serving on the custom domain. If the subscription is not renewed
          within that period, the custom domain is deactivated and redirects to your{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">articurls.site</code>{" "}
          subdomain until renewed.
        </p>
      </>
    ),
  },
  {
    title: "5. Your content",
    body: (
      <>
        <p>
          You own the posts, pages, media, and subscriber lists you create. By publishing, you grant
          Articurls a limited license to host, cache, and distribute that content — including via
          automatically generated feeds, sitemaps, and <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">llms.txt</code>{" "}
          files — solely to operate the service.
        </p>
        <p>
          You are responsible for anything you inject via custom HTML, CSS, or JavaScript code
          injection, and for any external newsletter webhook you connect. You agree not to use
          Articurls to host illegal content, malware, phishing pages, or spam, or to otherwise abuse
          the platform or its rate limits.
        </p>
      </>
    ),
  },
  {
    title: "6. Acceptable use",
    body: (
      <p>
        You agree to comply with all applicable laws and not to interfere with the operation of the
        service or the experience of other users. We may suspend or terminate accounts that violate
        these terms.
      </p>
    ),
  },
  {
    title: "7. Disclaimers and limitation of liability",
    body: (
      <p>
        Articurls is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without
        warranties of any kind. To the maximum extent permitted by law, Articurls is not liable for
        any indirect, incidental, or consequential damages arising from your use of the service.
      </p>
    ),
  },
  {
    title: "8. Changes and contact",
    body: (
      <p>
        We may update these terms from time to time. Continued use of the service after changes
        constitutes acceptance of the updated terms. Questions can be sent to{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(3.5rem+0.75rem+4rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(4rem+1rem+4rem)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,oklch(0.55_0.2_293/0.08),transparent_72%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Legal</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Last updated October 20, 2026
            </p>
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem] [&_code]:font-mono">
                  {section.body}
                </div>
              </div>
            ))}
            <div className="border-t border-border/70 pt-8 text-sm text-muted-foreground">
              <p>
                See also our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}