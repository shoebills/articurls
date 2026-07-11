import { BarChart3, Check, Globe, Mail } from "lucide-react";

export function HeroShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[38rem] select-none [perspective:1600px]"
    >
      <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_60%_35%,oklch(0.55_0.2_293/0.16),transparent_72%)]" />

      <div className="hero-rise relative aspect-[4/3.35] w-full [animation-delay:60ms] sm:aspect-[4/3]">
        <div className="hero-float-a absolute inset-x-0 top-0 z-10">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">
                Draft · Shipping a blog people actually read
              </span>
            </div>
            <div className="space-y-3 p-5">
              <div className="text-lg font-semibold tracking-tight text-foreground">
                Shipping a blog people actually read
                <span className="hero-caret ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 bg-[#7C3AED]" />
              </div>
              <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
              <div className="h-2.5 w-[92%] rounded-full bg-foreground/[0.07]" />
              <div className="h-2.5 w-3/4 rounded-full bg-foreground/[0.07]" />
              <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/25 p-3">
                <div className="h-24 rounded-lg bg-gradient-to-br from-muted to-background ring-1 ring-border/60" />
              </div>
            </div>
          </div>
        </div>

        <div className="hero-float-b absolute -bottom-2 left-0 z-30 w-[62%] max-w-[19rem] [animation-delay:400ms] sm:-bottom-4 sm:-left-6">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" /> Readers
              </span>
              <span className="text-xs font-medium text-emerald-600">Live</span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-1.5">
              {[38, 52, 44, 66, 58, 80, 72].map((h, i) => (
                <div
                  key={i}
                  className="hero-bar flex-1 rounded-sm bg-[#7C3AED]/80"
                  style={{ height: `${h}%`, animationDelay: `${500 + i * 90}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="hero-float-a absolute -right-1 top-[42%] z-40 w-[58%] max-w-[17rem] [animation-delay:600ms] sm:-right-6">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                <Globe className="h-3.5 w-3.5" />
                <span className="hero-ping absolute inset-0 rounded-lg ring-2 ring-[#7C3AED]/40" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">yourblog.com</p>
                <p className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> SSL active
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-float-b absolute -bottom-6 right-2 z-40 [animation-delay:800ms] sm:-bottom-8 sm:right-8">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-3.5 py-2 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
            <Mail className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span className="text-xs font-medium text-foreground">Published — subscribers notified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
