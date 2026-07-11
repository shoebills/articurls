import { AudienceSection } from "@/components/audience-section";
import { FaqSection } from "@/components/faq-section";
import { HeroShowcase } from "@/components/hero-showcase";
import { HowItWorks } from "@/components/how-it-works";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { ProblemSection } from "@/components/problem-section";
import { PricingSection } from "@/components/pricing-section";
import { ProductShowcase } from "@/components/product-showcase";
import { Button } from "@/components/ui/button";
import { appAuthHref } from "@/lib/env";

export default function MarketingPage() {
  const signupUrl = appAuthHref("/signup");

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-clip">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_55%_at_22%_12%,oklch(0.53_0.16_265/0.2),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_80%_18%,oklch(0.7_0.11_206/0.12),transparent_74%)]" />
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-30" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(3.5rem+0.75rem+4rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(4rem+1rem+4rem)] lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 lg:pb-24 lg:pt-[calc(4rem+1rem+5rem)]">
            <div className="min-w-0">
              <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
                Publish your own blog in minutes
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                No servers, plugins or updates. Just a fast,
                SEO-ready blog that&apos;s entirely yours.
              </p>
              <div className="mt-16 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row">
                <Button size="lg" className="h-12 min-h-12 shadow-lg shadow-primary/20" asChild>
                  <a href={signupUrl}>Start free</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12 min-h-12 bg-background/80" asChild>
                  <a href="#pricing">See pricing</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No credit card required
              </p>
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

        <FaqSection />

        <section className="px-[max(1rem,env(safe-area-inset-left))] pb-16 pr-[max(1rem,env(safe-area-inset-right))] pt-12 sm:px-6 sm:pb-20">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-neutral-950 px-6 py-24 text-center sm:px-10 sm:py-32 lg:py-40">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_115%,oklch(0.55_0.2_293/0.35),transparent_70%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_-10%,oklch(0.55_0.2_293/0.12),transparent_70%)]" aria-hidden />

            <p
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none bg-gradient-to-b from-white/[0.06] to-transparent bg-clip-text text-[22vw] font-semibold leading-none tracking-tighter text-transparent sm:text-[16rem]"
              aria-hidden
            >
              Own it
            </p>

            <div className="relative">
              <h2 className="mx-auto max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Own your words.<br />Own your audience.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/60 sm:text-lg">
                Your writing deserves more than a profile.
              </p>
              <div className="mt-10 flex justify-center">
                <Button
                  size="lg"
                  className="h-14 bg-white px-10 text-base text-neutral-950 shadow-2xl shadow-primary/20 hover:bg-white/90"
                  asChild
                >
                  <a href={signupUrl}>Start Free</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-white/40">No credit card required</p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
