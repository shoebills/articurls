import { AudienceSection } from "@/components/audience-section";
import { HeroShowcase } from "@/components/hero-showcase";
import { HowItWorks } from "@/components/how-it-works";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { ProblemSection } from "@/components/problem-section";
import { PricingSection } from "@/components/pricing-section";
import { ProductShowcase } from "@/components/product-showcase";
import { Button } from "@/components/ui/button";
import { appAuthHref } from "@/lib/env";
import { ArrowUpRight, Check } from "lucide-react";

export default function MarketingPage() {
  const signupUrl = appAuthHref("/signup");
  const loginUrl = appAuthHref("/login");

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_55%_at_22%_12%,oklch(0.53_0.16_265/0.2),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_80%_18%,oklch(0.7_0.11_206/0.12),transparent_74%)]" />
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-30" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-28">
            <div className="min-w-0">
              <p className="inline-flex items-center rounded-full border border-primary/20 bg-background/75 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                Your blog. Your domain. Your rules.
              </p>
              <h1 className="mt-5 max-w-[16ch] text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
                Own a beautiful blog on your&nbsp;own domain
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                No WordPress to maintain. No Ghost to host. No servers, plugins, or updates. Just a fast,
                SEO-ready blog that&apos;s entirely yours.
              </p>
              <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row">
                <Button size="lg" className="h-12 min-h-12 shadow-lg shadow-primary/20" asChild>
                  <a href={signupUrl}>Start free</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12 min-h-12 bg-background/80" asChild>
                  <a href="#examples">See live examples</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No credit card required · Publish on your domain in minutes
              </p>

              <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
                {["Custom domains", "SEO built-in", "Subscribers", "Analytics"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative w-full pt-4 lg:pt-0">
              <HeroShowcase />
            </div>
          </div>
        </section>

        <ProblemSection />

        <HowItWorks />

        <ProductShowcase />

        <AudienceSection />

        <PricingSection />

        <section className="px-[max(1rem,env(safe-area-inset-left))] pb-20 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border/70 bg-gradient-to-r from-background to-muted/40 p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to publish your next post?</h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                  Create a workspace, draft your post, and publish today.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12" asChild>
                  <a href={signupUrl}>Create free account</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12" asChild>
                  <a href={loginUrl} className="inline-flex items-center gap-1.5">
                    Log in
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
