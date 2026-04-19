import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { appAuthHref } from "@/lib/env";
import {
  BarChart3,
  CalendarClock,
  Check,
  Code2,
  LayoutTemplate,
  LineChart,
  Mail,
  Palette,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

export default function MarketingPage() {
  const signupFree = appAuthHref("/signup?plan_choice=free");
  const signupPro = appAuthHref("/signup?plan_choice=pro");
  const loginUrl = appAuthHref("/login");

  const features = [
    {
      icon: PenLine,
      title: "Editor that stays out of your way",
      description:
        "Headings, lists, links, code blocks, embeds, and uploads—everything you need for long-form posts without clutter.",
    },
    {
      icon: CalendarClock,
      title: "Drafts, publish, schedule",
      description:
        "Control the full lifecycle from idea to archive. Schedule posts for later and keep a clean publishing rhythm.",
    },
    {
      icon: Search,
      title: "SEO you can actually tune",
      description:
        "Set titles and descriptions for your profile and each post so search and social previews look intentional.",
    },
    {
      icon: LineChart,
      title: "Analytics that respect readers",
      description:
        "Track views and unique visitors on your public posts so you know what resonates—without turning your blog into a billboard.",
    },
    {
      icon: Mail,
      title: "Subscribers & launch emails",
      description: "Collect confirmed readers and optionally email them when something new goes live.",
      pro: true,
    },
    {
      icon: LayoutTemplate,
      title: "Pages & navigation",
      description: "Add static pages (About, links, press) and surface them in a polished nav alongside your writing.",
    },
    {
      icon: Palette,
      title: "Design & profile polish",
      description:
        "Shape how your public profile feels—navbar, blog name in the header, and a footer that matches your voice.",
    },
    {
      icon: BarChart3,
      title: "Monetization-ready",
      description:
        "When you are ready for Pro, wire in your ad snippet, choose frequency, and pick which published posts carry ads.",
      pro: true,
    },
  ] as const;

  const highlights = [
    {
      icon: Zap,
      title: "Fast by default",
      body: "Light pages, sensible defaults, and a reader experience that feels like a real publication—not a heavy CMS.",
    },
    {
      icon: Code2,
      title: "API-aligned product",
      body: "The dashboard maps cleanly to how posts, pages, and public URLs work—fewer surprises when you share links.",
    },
    {
      icon: ShieldCheck,
      title: "Built for ownership",
      body: "Export subscribers, tune SEO, and upgrade billing when you need Pro—your audience stays yours.",
    },
  ] as const;

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-40%,oklch(0.48_0.14_264/0.22),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(0.72_0.12_200/0.12),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.4]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden />

          <div className="relative mx-auto grid min-w-0 max-w-6xl items-center gap-8 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-14 sm:gap-10 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
            <div className="min-w-0">
              <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/90 shadow-sm sm:justify-start sm:px-3 sm:text-xs sm:tracking-[0.16em]">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Publishing for builders & writers
              </p>
              <h1 className="mt-5 text-center text-[1.625rem] font-bold leading-[1.1] tracking-tight text-balance sm:mt-6 sm:text-left sm:text-4xl sm:leading-[1.08] lg:text-[3.25rem] lg:leading-[1.05]">
                A calm home for serious writing on the web
              </h1>
              <p className="mt-4 max-w-xl text-center text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty sm:mt-5 sm:text-left sm:text-base sm:text-lg">
                Articurls pairs a focused editor with scheduling, SEO controls, analytics, optional subscribers, and a
                public profile readers will actually enjoy—without dragging you through generic site-builder flows.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:justify-start sm:gap-2 sm:text-sm">
                {["Drafts & schedule", "Per-post SEO", "Public pages", "Reader analytics"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border/80 bg-background/70 px-2.5 py-1 backdrop-blur-sm sm:px-3"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mx-0 sm:mt-10 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-4">
                <Button size="lg" className="h-12 min-h-12 w-full shadow-lg shadow-primary/25 sm:w-auto sm:min-w-[11rem]" asChild>
                  <a href={signupFree}>Start writing — free</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 min-h-12 w-full border-border/90 bg-background/70 backdrop-blur-sm sm:w-auto"
                  asChild
                >
                  <a href={loginUrl}>Log in</a>
                </Button>
              </div>
              <p className="mt-4 text-center text-[11px] leading-snug text-muted-foreground sm:text-left sm:text-sm">
                <span className="block sm:inline">No credit card for Free.</span>{" "}
                <span className="block sm:inline">Upgrade to Pro for subscriber emails, monetization, and more.</span>
              </p>
            </div>

            <div className="relative mx-auto mt-2 w-full min-w-0 max-w-[min(100%,22.5rem)] sm:mt-0 sm:max-w-md lg:mx-0 lg:mt-0 lg:max-w-none" aria-hidden>
              <div className="absolute -inset-2 rounded-[1.25rem] bg-gradient-to-br from-primary/12 via-transparent to-primary/5 blur-xl sm:-inset-4 sm:rounded-[2rem] sm:blur-2xl" />
              <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.04] backdrop-blur-sm sm:rounded-2xl sm:shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  <span className="ml-3 truncate text-[11px] font-medium text-muted-foreground">articurls — Draft</span>
                </div>
                <div className="space-y-4 p-5 sm:p-6">
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-primary/15" />
                    <div className="h-8 w-[92%] max-w-md rounded-md bg-foreground/[0.07]" />
                    <div className="h-8 w-[78%] rounded-md bg-foreground/[0.06]" />
                  </div>
                  <div className="space-y-2.5 pt-2">
                    <div className="h-2.5 w-full rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/12" />
                    <div className="h-2.5 w-[88%] rounded bg-muted-foreground/12" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/12" />
                    <div className="h-2.5 w-[70%] rounded bg-muted-foreground/10" />
                  </div>
                  <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-border/80 bg-muted/25 p-3 sm:grid-cols-2">
                    <div className="h-16 rounded-lg bg-background/80 ring-1 ring-border/60" />
                    <div className="hidden h-16 rounded-lg bg-background/60 ring-1 ring-border/50 sm:block" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-800">Ready to schedule</span>
                    <span className="rounded-md bg-muted px-2 py-0.5">SEO title set</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto grid max-w-6xl gap-10 px-[max(1rem,env(safe-area-inset-left))] py-12 pr-[max(1rem,env(safe-area-inset-right))] sm:grid-cols-3 sm:gap-8 sm:px-6 sm:py-14">
            {[
              { k: "Unlimited posts", v: "On Free and Pro", d: "Ship as often as you publish—no arbitrary post caps." },
              { k: "One public home", v: "Profile + blog", d: "Readers land on you, browse posts, and subscribe in one flow." },
              {
                k: "Upgrade when it fits",
                v: "Pro from $9/mo",
                d: "Subscriber emails, verification, more pages, and monetization when you are ready.",
              },
            ].map((row, i) => (
              <div key={row.k} className={`text-left ${i < 2 ? "border-b border-border/50 pb-10 sm:border-0 sm:pb-0" : ""}`}>
                <p className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{row.k}</p>
                <p className="mt-1 text-sm font-medium text-primary">{row.v}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] py-16 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Everything in one workspace</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
                From first draft to readers who come back
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:text-lg">
                The product is opinionated: fewer knobs, clearer paths, and surfaces that match what your public site actually
                does—writing, pages, discovery, and growth.
              </p>
            </div>

            <div className="mt-10 grid min-w-0 gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group relative flex min-h-0 flex-col rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm transition-[box-shadow,transform,border-color] duration-200 active:scale-[0.99] sm:rounded-2xl sm:p-5 sm:hover:-translate-y-0.5 sm:hover:border-primary/25 sm:hover:shadow-lg sm:hover:shadow-primary/[0.07] motion-reduce:transition-none motion-reduce:sm:hover:translate-y-0"
                >
                  {"pro" in f && f.pro ? (
                    <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:right-4 sm:top-4">
                      Pro
                    </span>
                  ) : null}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-1 ring-primary/15 sm:h-12 sm:w-12 sm:rounded-xl">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-3 text-base font-semibold tracking-tight sm:mt-4 sm:text-lg">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="product"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] border-y border-border/70 bg-gradient-to-b from-muted/25 via-background to-background px-[max(1rem,env(safe-area-inset-left))] py-16 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:gap-6 lg:grid-cols-3 lg:gap-8">
              <div className="min-w-0 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Why teams pick Articurls</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
                  Publishing that feels finished—not configured
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:text-lg">
                  Skip the theme marketplace spiral. Spend time in the editor, ship on a schedule you trust, and give readers a
                  profile that looks intentional on every device.
                </p>
              </div>
              <div className="flex min-w-0 flex-col justify-end rounded-xl border border-border/70 bg-card/90 p-5 shadow-sm sm:rounded-2xl sm:p-6">
                <p className="text-sm font-semibold text-foreground">Verification & polish</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Pro adds a verification tick and the ability to remove default Articurls branding from your public footer.
                </p>
              </div>
            </div>

            <div className="mt-8 grid min-w-0 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-3">
              {highlights.map((h) => (
                <div
                  key={h.title}
                  className="rounded-xl border border-border/70 bg-card/85 p-5 shadow-sm transition-shadow duration-200 sm:rounded-2xl sm:p-6 sm:hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <h.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] py-16 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">Start free. Scale with Pro.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:text-lg">
                Core writing and publishing stay free forever. Move to Pro when you want subscriber emails at publish time,
                verification, monetization, and more control over how you look on the web.
              </p>
            </div>

            <div className="mt-10 grid min-w-0 gap-5 sm:mt-14 sm:gap-6 lg:grid-cols-2 lg:gap-10">
              <Card className="relative flex min-h-0 flex-col overflow-hidden border-border/80 bg-card/95 shadow-md transition-shadow duration-200 sm:hover:shadow-lg">
                <CardHeader className="space-y-1 p-5 pb-3 pt-6 sm:p-6 sm:pb-4 sm:pt-8">
                  <CardTitle className="text-xl sm:text-2xl">Free</CardTitle>
                  <CardDescription className="text-balance text-sm sm:text-base">
                    Everything you need to write in public
                  </CardDescription>
                  <p className="pt-2 text-3xl font-bold tracking-tight sm:pt-3 sm:text-4xl">
                    $0<span className="text-base font-normal text-muted-foreground"> / mo</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-2.5 p-5 pt-0 text-sm sm:space-y-3 sm:p-6 sm:pt-0">
                  {[
                    "Unlimited posts & drafts",
                    "Public profile and blog listing",
                    "Per-post SEO fields",
                    "Views & unique visitor analytics",
                    "Static pages with optional nav",
                    "Design controls for navbar & footer",
                  ].map((x) => (
                    <div key={x} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span>{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-5 pb-6 pt-0 sm:p-6 sm:pt-0">
                  <Button className="h-12 min-h-12 w-full touch-manipulation" variant="outline" asChild>
                    <a href={signupFree}>Create free account</a>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="relative flex min-h-0 flex-col overflow-hidden border-primary/30 bg-gradient-to-b from-card via-card to-primary/[0.04] shadow-xl shadow-primary/15 ring-1 ring-primary/20 transition-[box-shadow,transform] duration-200 sm:hover:shadow-2xl sm:hover:shadow-primary/20 md:hover:-translate-y-0.5 motion-reduce:md:hover:translate-y-0">
                <div className="absolute -top-px left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-x-1/2 truncate rounded-b-lg bg-gradient-to-r from-primary to-[oklch(0.38_0.14_264)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-md sm:rounded-b-xl sm:px-5 sm:text-xs">
                  Most popular
                </div>
                <CardHeader className="space-y-1 p-5 pb-3 pt-11 sm:p-6 sm:pb-4 sm:pt-12">
                  <CardTitle className="text-xl sm:text-2xl">Pro</CardTitle>
                  <CardDescription className="text-balance text-sm sm:text-base">
                    When your audience and brand need more
                  </CardDescription>
                  <p className="pt-2 text-3xl font-bold tracking-tight sm:pt-3 sm:text-4xl">
                    $9<span className="text-base font-normal text-muted-foreground"> / mo</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-2.5 p-5 pt-0 text-sm sm:space-y-3 sm:p-6 sm:pt-0">
                  {[
                    "Everything in Free",
                    "Up to 10 static pages (Free includes 1)",
                    "Email confirmed subscribers when you publish",
                    "Verification tick on your public profile",
                    "Remove Articurls footer branding",
                    "Monetization: ad snippet, frequency, per-post selection",
                    "Stripe-powered billing in the app",
                  ].map((x) => (
                    <div key={x} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span>{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-5 pb-6 pt-0 sm:p-6 sm:pt-0">
                  <Button className="h-12 min-h-12 w-full touch-manipulation shadow-lg shadow-primary/25" asChild>
                    <a href={signupPro}>Get Pro — $9/mo</a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 bg-gradient-to-r from-primary/[0.08] via-background to-primary/[0.06] px-[max(1rem,env(safe-area-inset-left))] py-12 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center sm:gap-6">
            <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Ready to ship your next post?</h2>
            <p className="max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
              Join in minutes, publish from a calm editor, and share a profile link you are proud to put in your bio.
            </p>
            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 min-h-12 w-full touch-manipulation shadow-md shadow-primary/20 sm:w-auto sm:min-w-[12rem]" asChild>
                <a href={signupFree}>Get started — free</a>
              </Button>
              <Button size="lg" variant="secondary" className="h-12 min-h-12 w-full touch-manipulation sm:w-auto" asChild>
                <a href={loginUrl}>I already have an account</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
