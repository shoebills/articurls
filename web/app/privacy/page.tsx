import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { MARKETING_ORIGIN } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Articurls collects, uses, stores, and protects your data — and the choices you have about it.",
  alternates: { canonical: `${MARKETING_ORIGIN}/privacy` },
};

const SUPPORT_EMAIL = "support@articurls.com";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Who we are",
    body: (
      <p>
        Articurls is a hosted blogging platform. This policy explains how we handle data when you
        use our website, create an account, publish a blog, or subscribe to a publication hosted on
        Articurls. We are the data controller for the platform itself; individual publication
        owners are responsible for the content and audiences they build on their own blogs.
      </p>
    ),
  },
  {
    title: "2. Information we collect",
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">Account and profile data.</strong>{" "}
          When you sign up we collect your name and email address, and store a hash of your
          password. We may also store a profile image, your chosen subdomain, publication name,
          timezone, and — if you fill in an author profile — bio, occupation, and social links.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Google sign-in.</strong> If you sign in
          with Google, we collect your Google account identifier, your verified email address, your
          display name, and your Google profile picture. We only trust emails that Google has
          verified.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Content you publish.</strong> Posts,
          pages, categories, authors, and the images you upload are stored so we can serve them to
          your readers.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Billing data.</strong> Payments are
          processed by DodoPayments, our merchant of record. We store only identifiers needed to
          reconcile your subscription (such as a customer and subscription ID) — never your raw
          credit card number.
        </p>
      </>
    ),
  },
  {
    title: "3. Unverified accounts",
    body: (
      <p>
        Accounts that have not verified their email address are automatically and permanently
        deleted 14 days after sign-up, along with their associated data.
      </p>
    ),
  },
  {
    title: "4. Cookies and browser storage",
    body: (
      <>
        <p>
          <strong className="font-semibold text-foreground">No tracking cookies on blogs.</strong>{" "}
          Public blogs hosted on Articurls do not set advertising or cross-site tracking cookies.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Authentication cookie.</strong> We set a
          single <code className="rounded bg-muted px-1.5 py-0.5 text-[0.875em]">refresh_token</code>{" "}
          cookie that is HttpOnly, Secure, and SameSite=Lax. It expires after 7 days and is rotated
          on refresh, and is used only to keep you signed in to the dashboard.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Local storage.</strong> We use your
          browser&apos;s local storage for a short-lived access token, your active publication
          selection, your last sign-in method, local draft backups in the editor, and an analytics
          opt-out flag.
        </p>
      </>
    ),
  },
  {
    title: "5. Analytics on public blogs",
    body: (
      <p>
        Public blogs include first-party, cookie-free analytics powered by a self-hosted instance of
        Umami, proxied through the blog&apos;s own domain. We collect aggregate, privacy-friendly
        metrics such as pageviews, visitors, referrers, device and browser type, and a country-level
        estimate derived from the request IP address. We do not build cross-site profiles or sell
        this data. Blog owners can exclude their own visits from analytics at any time.
      </p>
    ),
  },
  {
    title: "6. Newsletter subscribers",
    body: (
      <>
        <p>
          When a reader subscribes to a blog hosted on Articurls, we store their email address on
          behalf of that publication owner. Subscribers are collected on-site without a
          confirmation email, and <strong className="font-semibold text-foreground">
          Articurls does not send emails to subscribers on a publication owner&apos;s behalf</strong>.
        </p>
        <p>
          This means subscribing and unsubscribing is managed entirely at the publication
          owner&apos;s end. We provide the storage and (optionally) a webhook that forwards new
          subscriber details to the email provider the owner has connected, but we never email
          subscribers ourselves. To unsubscribe, or to request removal of your email, you must
          contact the publication owner directly or use the unsubscribe options provided by their
          connected email service provider.
        </p>
        <p>
          <strong className="font-semibold text-foreground">Connected newsletter providers.</strong>{" "}
          A publication owner may connect an external email service provider (ESP) or automation
          tool via a webhook. When configured, new subscriber email addresses are synced to that
          provider, and the provider — not Articurls — manages the owner&apos;s list and any
          unsubscribes. We recommend reviewing the publication owner&apos;s and their provider&apos;s
          privacy policies.
        </p>
      </>
    ),
  },
  {
    title: "7. Publisher-configured third-party integrations",
    body: (
      <p>
        Individual publication owners may enable third-party tools on their own blogs, including
        Google Analytics, Google AdSense, Google Search Console verification, and custom
        HTML/CSS/JavaScript code injection. Those scripts are configured and controlled by the
        respective publication owner and are governed by the third party&apos;s own privacy policy,
        not this one.
      </p>
    ),
  },
  {
    title: "8. Service providers",
    body: (
      <>
        <p>We rely on a small set of providers to operate the platform:</p>
        <ul>
          <li><strong className="font-semibold text-foreground">DodoPayments</strong> — payment processing and subscription billing.</li>
          <li><strong className="font-semibold text-foreground">Cloudflare R2</strong> — storage for uploaded images and files.</li>
          <li><strong className="font-semibold text-foreground">Vercel</strong> — edge hosting, caching, and SSL certificate provisioning.</li>
          <li><strong className="font-semibold text-foreground">Resend (or an SMTP provider)</strong> — transactional email such as verification, password reset, and billing notifications.</li>
        </ul>
      </>
    ),
  },
  {
    title: "9. Data retention, export, and deletion",
    body: (
      <p>
        You may export your content and subscriber list at any time. Deleting a publication or your
        account removes your uploaded media from storage, removes custom domain registrations,
        deletes the associated analytics, and cascades deletion across all related database records.
        Unverified accounts are deleted automatically after 14 days as described above. To request
        access to or deletion of your personal data, contact{" "}
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
  {
    title: "10. Changes to this policy",
    body: (
      <p>
        We may update this policy from time to time. Material changes will be reflected on this
        page with an updated revision date. Questions about this policy can be sent to{" "}
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

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(3.5rem+0.75rem+4rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(4rem+1rem+4rem)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,oklch(0.55_0.2_293/0.08),transparent_72%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Legal</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Privacy Policy
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
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem] [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_code]:font-mono">
                  {section.body}
                </div>
              </div>
            ))}
            <div className="border-t border-border/70 pt-8 text-sm text-muted-foreground">
              <p>
                See also our{" "}
                <Link
                  href="/terms"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
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