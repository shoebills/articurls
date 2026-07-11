import { HeroShowcase } from "@/components/hero-showcase";
import { HowItWorks } from "@/components/how-it-works";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { ProblemSection } from "@/components/problem-section";
import { ProductShowcase } from "@/components/product-showcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { appAuthHref } from "@/lib/env";
import { ArrowUpRight, Check, Flame, Star, Zap } from "lucide-react";

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

        <section
          id="pricing"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pb-20 pr-[max(1rem,env(safe-area-inset-right))] pt-6 sm:px-6 sm:pb-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple plans</h2>
              <p className="mt-3 text-base text-muted-foreground">Start free. Upgrade only when your workflow needs more.</p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <Card className="flex flex-col rounded-2xl border-border/80 bg-card/90">
                <CardHeader className="space-y-1 p-6">
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription>Core publishing workflow</CardDescription>
                  <p className="text-4xl font-semibold tracking-tight">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 px-6 text-sm">
                  {[
                    "Unlimited posts",
                    "Unlimited pages & categories",
                    "Post scheduling",
                    "Meta fields",
                    "Reader analytics",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                      <span className="text-muted-foreground">{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-6 pt-4">
                  <Button className="h-12 w-full" variant="outline" asChild>
                    <a href={signupUrl}>Get started</a>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="relative flex flex-col rounded-2xl border-primary/35 bg-gradient-to-b from-card to-primary/[0.05] shadow-xl shadow-primary/10 ring-1 ring-primary/25">
                <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary">
                  <Star className="h-3.5 w-3.5" />
                  Recommended
                </div>
                <CardHeader className="space-y-1 p-6">
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <CardDescription>For teams shipping consistently</CardDescription>
                  <p className="text-4xl font-semibold tracking-tight">$9<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 px-6 text-sm">
                  {[
                    "Everything in Free",
                    "Custom domain & SSL",
                    "Publish emails to subscribers",
                    "Collect email subscribers",
                    "Footer branding removal",
                    "Unlimited media storage",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                      <span className="text-muted-foreground">{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-6 pt-4">
                  <Button className="h-12 w-full shadow-md shadow-primary/20" asChild>
                    <a href={`${signupUrl}?plan=pro`}>Start Pro</a>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="relative flex flex-col rounded-2xl border-amber-500/30 bg-gradient-to-b from-card to-amber-500/[0.06] shadow-xl shadow-amber-500/8 ring-1 ring-amber-500/20">
                <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  <Flame className="h-3.5 w-3.5" />
                  Only 50 seats
                </div>
                <CardHeader className="space-y-1 p-6">
                  <CardTitle className="text-2xl">Lifetime</CardTitle>
                  <CardDescription>Buy once, own forever</CardDescription>
                  <p className="text-4xl font-semibold tracking-tight">$99<span className="text-base font-normal text-muted-foreground"> one-time</span></p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 px-6 text-sm">
                  {[
                    "Everything in Pro, forever",
                    "No recurring charges",
                    "Lifetime custom domain & SSL",
                    "Lifetime subscriber emails",
                    "Future Pro features included",
                    "Pay once, yours for life",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                      <span className="text-muted-foreground">{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-6 pt-4">
                  <Button className="h-12 w-full bg-amber-500 text-amber-950 shadow-md shadow-amber-500/25 hover:bg-amber-500/90" asChild>
                    <a href={`${signupUrl}?plan=lifetime`}>
                      <Zap className="mr-1.5 h-4 w-4" />
                      Get Lifetime Access
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No annual contract. Cancel anytime. Lifetime is a one-time payment — no recurring fees.</p>
          </div>
        </section>

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
