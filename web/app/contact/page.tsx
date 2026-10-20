import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { appAuthHref, MARKETING_ORIGIN } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Articurls team for product questions, billing help, and legal or privacy inquiries.",
  alternates: { canonical: `${MARKETING_ORIGIN}/contact` },
};

const SUPPORT_EMAIL = "support@articurls.com";

const TOPICS = [
  {
    title: "General & product questions",
    body: "Anything about features, themes, publishing, or how Articurls works.",
    subject: "General Inquiry",
  },
  {
    title: "Billing & subscriptions",
    body: "Questions about plans, the 7-day trial, invoices, or your subscription.",
    subject: "Billing Inquiry",
  },
  {
    title: "Privacy, legal & abuse",
    body: "Data requests, privacy questions, or reporting a publication that violates our terms.",
    subject: "Legal / Privacy Inquiry",
  },
] as const;

export default function ContactPage() {
  const supportHref = appAuthHref("/dashboard/support");

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(3.5rem+0.75rem+4rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(4rem+1rem+4rem)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,oklch(0.55_0.2_293/0.08),transparent_72%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Contact</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Get in touch
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              We&apos;re a small team, but we read everything. Reach us directly at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                {SUPPORT_EMAIL}
              </a>
              , or pick a topic below.
            </p>
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {TOPICS.map((topic) => (
              <div key={topic.title} className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
                <h2 className="text-lg font-semibold tracking-tight">{topic.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {topic.body}
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(topic.subject)}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Email us
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.05] to-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold tracking-tight">Already using Articurls?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                Logged-in users get faster help through the dashboard. Your support message automatically
                includes your account email and publication URL, so we can dig in right away.
              </p>
              <a
                href={supportHref}
                className="mt-5 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-md shadow-primary/15 outline-none transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-primary/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Open dashboard support
              </a>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Looking for a quick answer? Check the{" "}
              <Link
                href={`${MARKETING_ORIGIN}/#faq`}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                FAQs
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}