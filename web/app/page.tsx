import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingNav } from "@/components/marketing-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ORIGIN } from "@/lib/env";
import { BarChart3, CalendarClock, Check, FileText } from "lucide-react";

export default function MarketingPage() {
  const signupFree = `${APP_ORIGIN}/signup?plan_choice=free`;
  const signupPro = `${APP_ORIGIN}/signup?plan_choice=pro`;
  const loginUrl = `${APP_ORIGIN}/login`;

  const features = [
    {
      icon: FileText,
      title: "Medium-style writing",
      body: "A minimal editor with headings, embeds, code blocks, and media uploads tied to each post.",
    },
    {
      icon: CalendarClock,
      title: "Lifecycle you control",
      body: "Draft, publish, archive, or schedule. Optional email to confirmed subscribers when a post goes live (Pro).",
    },
    {
      icon: BarChart3,
      title: "Readers & revenue",
      body: "Public profiles at your domain, subscriber export, views and unique visitors, and Pro checkout when you’re ready.",
    },
  ] as const;

  return (
    <>
      <MarketingNav />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/80">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-25%,oklch(0.52_0.16_264/0.18),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.35]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 md:py-32">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
              Blogging for builders & writers
            </p>
            <h1 className="mx-auto mt-5 max-w-3xl text-center text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl sm:leading-[1.1] md:text-5xl lg:text-6xl">
              Your words deserve a calm, fast home on the web
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              Articurls is a focused writing surface with drafts, scheduling, SEO controls, subscriber emails for Pro, and
              analytics—without the noise of a generic site builder.
            </p>
            <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Button size="lg" className="w-full shadow-md shadow-primary/20 sm:w-auto" asChild>
                <a href={signupFree}>Get started — free</a>
              </Button>
              <Button size="lg" variant="outline" className="w-full border-border/90 bg-background/60 backdrop-blur-sm sm:w-auto" asChild>
                <a href={loginUrl}>Log in</a>
              </Button>
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for publishing, not fiddling</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Everything lines up with how the Articurls API works—so what you see in the app is what your readers get.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card
                key={f.title}
                className="group relative overflow-hidden border-border/70 bg-card/80 shadow-sm transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/[0.06] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <CardHeader className="pb-3">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-t border-border/80 bg-gradient-to-b from-muted/30 via-muted/20 to-background py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pricing</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">Start free. Upgrade when you want Pro features.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-10">
              <Card className="relative flex flex-col border-border/80 bg-card/90 shadow-md transition-shadow duration-200 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>Core writing and publishing</CardDescription>
                  <p className="pt-2 text-3xl font-bold tracking-tight">
                    $0<span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  {["Unlimited posts", "Public profile & blog", "Basic analytics"].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      {x}
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" asChild>
                    <a href={signupFree}>Get started</a>
                  </Button>
                </CardFooter>
              </Card>

              <Card className="relative flex flex-col overflow-hidden border-primary/25 bg-gradient-to-b from-card to-primary/[0.03] shadow-lg shadow-primary/10 ring-1 ring-primary/15 transition-[box-shadow,transform] duration-200 hover:shadow-xl hover:shadow-primary/15 md:hover:-translate-y-0.5 motion-reduce:md:hover:translate-y-0">
                <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-primary to-[oklch(0.38_0.14_264)] px-4 py-1 text-xs font-semibold tracking-wide text-primary-foreground shadow-sm">
                  Popular
                </div>
                <CardHeader className="pt-9">
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For creators going further</CardDescription>
                  <p className="pt-2 text-3xl font-bold tracking-tight">
                    $9<span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  {[
                    "Custom domain & verification",
                    "Email subscribers on publish",
                    "Verification tick & profile polish",
                    "Remove footer branding",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      {x}
                    </div>
                  ))}
                </CardContent>
                <CardFooter>
                  <Button className="w-full shadow-md shadow-primary/20" asChild>
                    <a href={signupPro}>Get started — Pro</a>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
