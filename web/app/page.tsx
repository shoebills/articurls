import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { appAuthHref } from "@/lib/env";
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Eye,
  FolderKanban,
  Mail,
  PenLine,
  Search,
  Star,
} from "lucide-react";

export default function MarketingPage() {
  const signupFree = appAuthHref("/signup?plan_choice=free");
  const signupPro = appAuthHref("/signup?plan_choice=pro");
  const loginUrl = appAuthHref("/login");

  const features = [
    {
      icon: PenLine,
      title: "Distraction-free editor",
      description: "Write, embed, and format without leaving the draft.",
    },
    {
      icon: CalendarClock,
      title: "Ship on your timeline",
      description: "Draft now, schedule later, publish when it matters.",
    },
    {
      icon: Search,
      title: "SEO controls",
      description: "Set post metadata without touching extra tools.",
    },
    {
      icon: Eye,
      title: "Reader analytics",
      description: "Track views and unique readers in one glance.",
    },
    {
      icon: Mail,
      title: "Subscriber emails",
      description: "Notify confirmed readers when new posts go live.",
      pro: true,
    },
    {
      icon: FolderKanban,
      title: "Pages and navigation",
      description: "Add About, links, and custom pages in minutes.",
    },
  ] as const;

  return (
    <>
      <MarketingNav />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_72%_55%_at_22%_12%,oklch(0.53_0.16_265/0.2),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_45%_at_80%_18%,oklch(0.7_0.11_206/0.12),transparent_74%)]" />
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-30" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-[max(1rem,env(safe-area-inset-left))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:pt-28">
            <div className="min-w-0">
              <p className="inline-flex items-center rounded-full border border-primary/20 bg-background/75 px-3 py-1 text-xs text-primary backdrop-blur">
                Built for focused publishing
              </p>
              <h1 className="mt-5 max-w-[18ch] text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
                Publish in one clean flow
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Write, schedule, publish, and track readers without bouncing between tools.
              </p>
              <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row">
                <Button size="lg" className="h-12 min-h-12 shadow-lg shadow-primary/20" asChild>
                  <a href={signupFree}>Start free</a>
                </Button>
                <Button size="lg" variant="outline" className="h-12 min-h-12 bg-background/80" asChild>
                  <a href="#pricing">See pricing</a>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                No credit card required
              </p>
            </div>

            <div className="relative mx-auto hidden w-full max-w-[40rem] lg:block" aria-hidden>
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/15 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="flex items-center gap-2 border-b border-border/70 bg-muted/45 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  <span className="ml-3 truncate text-xs text-muted-foreground">Editor preview</span>
                </div>
                <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-4">
                    <div className="h-2.5 w-24 rounded bg-primary/20" />
                    <div className="h-8 w-[88%] rounded bg-foreground/10" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-3/4 rounded bg-muted-foreground/15" />
                    <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/35 p-3">
                      <div className="h-28 rounded-md bg-background ring-1 ring-border/70" />
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Publish</span>
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-800">Ready</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-20 rounded bg-muted-foreground/30" />
                      <div className="h-8 rounded bg-muted/70 ring-1 ring-border/70" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 w-16 rounded bg-muted-foreground/30" />
                      <div className="h-8 rounded bg-muted/70 ring-1 ring-border/70" />
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      1,284 reads this month
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-[max(1rem,env(safe-area-inset-left))] pt-20 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-3 text-base text-justify text-muted-foreground">From first draft to published post in three steps.</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Write your draft",
                  body: "Start with the editor and shape your post with media, embeds, and formatting.",
                },
                {
                  step: "02",
                  title: "Set publish details",
                  body: "Choose slug, SEO, schedule, and whether to notify subscribers.",
                },
                {
                  step: "03",
                  title: "Publish and iterate",
                  body: "Share your link, watch reader analytics, and update anytime.",
                },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-border/70 bg-card/70 p-5">
                  <p className="text-xs font-semibold tracking-[0.14em] text-primary">{item.step}</p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm text-justify text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] py-20 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Core workflow, no filler</h2>
              <p className="mt-3 text-base text-muted-foreground">Six tools you use every week, in one calm interface.</p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {features.map((f, idx) => (
                <div
                  key={f.title}
                  className={`group relative rounded-2xl border border-border/70 bg-card/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] ${
                    idx === 0 || idx === 3 ? "lg:col-span-2" : ""
                  }`}
                >
                  {"pro" in f && f.pro ? (
                    <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Pro
                    </span>
                  ) : null}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pb-20 pr-[max(1rem,env(safe-area-inset-right))] pt-6 sm:px-6 sm:pb-28"
        >
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple plans</h2>
              <p className="mt-3 text-base text-muted-foreground">Start free. Upgrade only when your workflow needs more.</p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card className="flex flex-col rounded-2xl border-border/80 bg-card/90">
                <CardHeader className="space-y-1 p-6">
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription>Core publishing workflow</CardDescription>
                  <p className="text-4xl font-semibold tracking-tight">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 px-6 text-sm">
                  {["Unlimited posts", "Post scheduling", "SEO fields", "Reader analytics", "One page in nav"].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                      <span className="text-muted-foreground">{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-6 pt-4">
                  <Button className="h-12 w-full" variant="outline" asChild>
                    <a href={signupFree}>Get started</a>
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
                    "Up to 10 pages in navigation",
                    "Publish emails to subscribers",
                    "Verification badge",
                    "Footer branding removal",
                    "Monetization controls",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-700" aria-hidden />
                      <span className="text-muted-foreground">{x}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-6 pt-4">
                  <Button className="h-12 w-full shadow-md shadow-primary/20" asChild>
                    <a href={signupPro}>Start Pro</a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No annual contract. Cancel anytime.</p>
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
                  <a href={signupFree}>Create free account</a>
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
