import { BarChart3, Check, FileJson2, Globe } from "lucide-react";

export function HeroShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[38rem] select-none pb-20 [perspective:1600px] sm:pb-10 lg:pb-0"
    >
      <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_60%_35%,oklch(0.55_0.2_293/0.16),transparent_72%)]" />

      <div className="hero-rise relative aspect-[4/3.9] w-full [animation-delay:60ms] sm:aspect-[4/3]">
        {/* Main editor card */}
        <div className="hero-float-a absolute inset-x-0 top-0 z-10">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">
                Editor
              </span>
            </div>
            <div className="space-y-3 p-5">
              <div className="text-lg font-semibold tracking-tight text-foreground">
                How we grew organic traffic 4x in 90 days
                <span className="hero-caret ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 bg-[#7C3AED]" />
              </div>
              <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
              <div className="h-2.5 w-[92%] rounded-full bg-foreground/[0.07]" />
              <div className="h-2.5 w-3/4 rounded-full bg-foreground/[0.07]" />

              {/* FAQ schema block */}
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/25 p-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <FileJson2 className="h-3.5 w-3.5" />
                    FAQ
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    FAQPage
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  <div className="h-2 w-3/4 rounded-full bg-foreground/[0.09]" />
                  <div className="h-2 w-2/3 rounded-full bg-foreground/[0.06]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom domain / subdirectory */}
        <div className="hero-float-b absolute -bottom-2 left-0 z-30 w-[62%] max-w-[19rem] [animation-delay:400ms] sm:-bottom-4 sm:-left-6">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> Subdirectory
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <Check className="h-3 w-3" /> Live
              </span>
            </div>
            <p className="mt-2 truncate rounded-lg bg-muted/50 px-2.5 py-1.5 font-mono text-sm font-semibold tracking-tight text-foreground">
              acme.com/blog
            </p>
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              OR
            </p>
            <div className="mt-2 border-t border-border/60 pt-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" /> Custom domain
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="h-3 w-3" /> Live
                </span>
              </div>
              <p className="mt-2 truncate rounded-lg bg-muted/50 px-2.5 py-1.5 font-mono text-sm font-semibold tracking-tight text-foreground">
                acme.com
              </p>
            </div>
          </div>
        </div>

        {/* Live analytics */}
        <div className="hero-float-a absolute -right-1 top-[42%] z-40 w-[58%] max-w-[17rem] [animation-delay:600ms] sm:-right-6">
          <div className="rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                12 online
              </span>
            </div>
            <svg viewBox="0 0 300 80" className="mt-3 h-14 w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hero-pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="hero-vi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath([0.3, 0.44, 0.38, 0.6, 0.52, 0.78, 0.7, 0.9])} fill="url(#hero-pv)" />
              <path d={linePath([0.3, 0.44, 0.38, 0.6, 0.52, 0.78, 0.7, 0.9])} fill="none" stroke="oklch(0.6 0.15 145)" strokeWidth="2.5" strokeLinecap="round" />
              <path d={areaPath([0.18, 0.28, 0.24, 0.4, 0.34, 0.52, 0.46, 0.62])} fill="url(#hero-vi)" />
              <path d={linePath([0.18, 0.28, 0.24, 0.4, 0.34, 0.52, 0.46, 0.62])} fill="none" stroke="oklch(0.58 0.18 280)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Optimized for AI search */}
        <div className="hero-float-b absolute -bottom-6 right-2 z-40 [animation-delay:800ms] sm:-bottom-8 sm:right-8">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-3.5 py-2 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
            <div>
              <p className="text-xs font-medium text-foreground">Optimized for AI search</p>
              <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                llms.txt · JSON-LD · Sitemap &amp; more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function chartPoints(values: number[], w = 300, h = 80) {
  const stepX = w / (values.length - 1);
  return values.map((v, i) => [i * stepX, h - v * (h * 0.8)] as const);
}

function linePath(values: number[]) {
  const pts = chartPoints(values);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const cx = (px + x) / 2;
    d += ` C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }
  return d;
}

function areaPath(values: number[]) {
  const pts = chartPoints(values);
  return `${linePath(values)} L ${pts[pts.length - 1][0]} 80 L ${pts[0][0]} 80 Z`;
}