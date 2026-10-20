import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { appAuthHref, MARKETING_ORIGIN } from "@/lib/env";

export const metadata: Metadata = {
  title: "About",
  description:
    "Articurls is a calmer way to publish on the web — one focused place for your writing, audience, and growth.",
  alternates: { canonical: `${MARKETING_ORIGIN}/about` },
};

const PILLARS = [
  {
    title: "Fast by default, zero maintenance",
    body: "Edge-cached pages, automatic SSL, and validated image handling. No servers to patch, no plugins to update, no databases to babysit.",
  },
  {
    title: "True ownership",
    body: "Publish on your own domain — a subdomain, an apex domain, or a subdirectory of a site you already run. Your content and subscriber list stay portable and exportable.",
  },
  {
    title: "Built for search and AI",
    body: "Automatic sitemaps, robots.txt, canonical URLs, JSON-LD structured data, and 301 redirects when slugs change — plus RSS, Atom, and llms.txt feeds that keep every reader in the loop.",
  },
  {
    title: "Privacy-first by default",
    body: "Cookie-free, first-party analytics. Understand what readers actually do without creepy ad-tech trackers or consent banners.",
  },
] as const;

const AUDIENCES = [
  "Hobby writers",
  "Developers",
  "Indie hackers",
  "Startup founders",
  "Technical writers",
] as const;

export default function AboutPage() {
  const signupUrl = appAuthHref("/signup?plan=pro");

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(3.5rem+0.75rem+4rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(4rem+1rem+4rem)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,oklch(0.55_0.2_293/0.08),transparent_72%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">About Articurls</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              A calmer way to publish on the web
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Publishing online shouldn&apos;t mean stitching together a CMS, a host, DNS, SSL,
              image storage, a newsletter form, and an analytics script. Articurls brings it all
              into one quiet place so you can get back to the writing.
            </p>
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
                <h2 className="text-xl font-semibold tracking-tight">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Who it&apos;s for</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for people who&apos;d rather write
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {AUDIENCES.map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-border/70 bg-muted/40 px-4 py-2 text-sm font-medium text-foreground/80"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start writing in minutes</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Claim your subdomain, write your first post, and publish it on your own domain — all before
              your coffee gets cold.
            </p>
            <a
              href={signupUrl}
              className="mt-8 inline-flex h-12 items-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow-md shadow-primary/15 outline-none transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-primary/92 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Start for free
            </a>
            <p className="mt-3 text-sm text-muted-foreground">No credit card required</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}