"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
  Quote,
  Link2,
  Highlighter,
  CalendarClock,
  Check,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
} from "lucide-react";

const PANELS = [
  {
    key: "editor",
    kicker: "Write",
    title: "A calm, focused editor",
    body: "Rich formatting, images, and embeds with nothing to configure, and nothing in your way.",
    visual: <EditorPanel />,
  },
  {
    key: "publishing",
    kicker: "Publish",
    title: "Ship now or schedule it",
    body: "Publish instantly or pick a date and time. Your post goes live on its own.",
    visual: <PublishingPanel />,
  },
  {
    key: "seo",
    kicker: "Get found",
    title: "SEO handled for you",
    body: "Meta tags, sitemap, robots, and RSS are built in and always up to date.",
    visual: <SeoPanel />,
  },
  {
    key: "subscribers",
    kicker: "Grow",
    title: "Turn readers into subscribers",
    body: "Collect emails from your posts and notify everyone when you publish.",
    visual: <SubscribersPanel />,
  },
  {
    key: "analytics",
    kicker: "Understand",
    title: "Analytics that make sense",
    body: "Pageviews, visitors, and trends, all privacy-friendly with no setup required.",
    visual: <AnalyticsPanel />,
  },
  {
    key: "domain",
    kicker: "Own",
    title: "Your own custom domain",
    body: "Connect your domain with automatic SSL. It's your blog, on your address.",
    visual: <DomainPanel />,
  },
] as const;

export function ProductShowcase() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total <= 0) return;
        const progress = Math.min(1, Math.max(0, -rect.top / total));
        const idx = Math.min(PANELS.length - 1, Math.floor(progress * PANELS.length));
        setActive(idx);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      id="features"
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6"
    >
      <div className="mx-auto max-w-6xl pt-24 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The product</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Everything your blog needs, in one place
          </h2>
        </div>
      </div>

      {/* Desktop: sticky scroll-driven showcase */}
      <div ref={sectionRef} className="relative mx-auto hidden max-w-6xl lg:block" style={{ height: `${PANELS.length * 90}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="grid w-full grid-cols-[0.85fr_1.15fr] items-center gap-12">
            <div className="relative">
              <ol className="space-y-1">
                {PANELS.map((panel, i) => {
                  const on = i === active;
                  return (
                    <li key={panel.key}>
                      <div
                        className={`relative rounded-xl px-4 py-3.5 transition-all duration-500 ${
                          on ? "bg-muted/50" : ""
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-all duration-500 ${
                            on ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] transition-colors duration-500 ${
                            on ? "text-primary" : "text-muted-foreground/60"
                          }`}
                        >
                          {panel.kicker}
                        </p>
                        <h3
                          className={`mt-1 text-xl font-semibold tracking-tight transition-colors duration-500 ${
                            on ? "text-foreground" : "text-muted-foreground/60"
                          }`}
                        >
                          {panel.title}
                        </h3>
                        <div
                          className={`grid transition-all duration-500 ${
                            on ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <p className="overflow-hidden text-sm leading-relaxed text-muted-foreground">
                            {panel.body}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="relative h-[30rem]">
              {PANELS.map((panel, i) => {
                const on = i === active;
                return (
                  <div
                    key={panel.key}
                    aria-hidden={!on}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                      on
                        ? "z-10 translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-4 scale-[0.97] opacity-0"
                    }`}
                  >
                    <div className="w-full max-w-xl">{panel.visual}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / tablet: stacked reveal cards */}
      <div className="mx-auto mt-12 max-w-xl space-y-20 lg:hidden">
        {PANELS.map((panel) => (
          <MobileCard key={panel.key} panel={panel} />
        ))}
      </div>
    </section>
  );
}

function MobileCard({ panel }: { panel: (typeof PANELS)[number] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { rootMargin: "0px 0px -18% 0px", threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{panel.kicker}</p>
      <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{panel.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{panel.body}</p>
      <div className="mt-4">{panel.visual}</div>
    </div>
  );
}

/* ── Shared frame ─────────────────────────────────────────── */

function AppFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_30px_90px_-48px_rgba(15,23,42,0.5)]">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ── 1. Editor ────────────────────────────────────────────── */

function EditorPanel() {
  const tools = [
    { icon: Bold, on: true },
    { icon: Italic, on: false },
    { icon: Heading1, on: false },
    { icon: Heading2, on: false },
    { icon: List, on: false },
    { icon: ListOrdered, on: false },
    { icon: Quote, on: false },
    { icon: Link2, on: false },
    { icon: Highlighter, on: false },
    { icon: ImageIcon, on: false },
  ];
  return (
    <AppFrame label="Editor">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-background px-3 py-2">
        {tools.map(({ icon: Icon, on }, i) => (
          <span
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              on ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
        ))}
      </div>
      <div className="space-y-3 p-6">
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          Building in public: month one
          <span className="hero-caret ml-0.5 inline-block h-6 w-[2px] translate-y-1 bg-primary" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[94%] rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[76%] rounded-full bg-foreground/[0.07]" />
        <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/25 p-3">
          <div className="h-28 rounded-lg bg-gradient-to-br from-muted to-background ring-1 ring-border/60" />
        </div>
        <div className="h-2.5 w-[88%] rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-1/2 rounded-full bg-foreground/[0.07]" />
      </div>
    </AppFrame>
  );
}

/* ── 2. Publishing ────────────────────────────────────────── */

function PublishingPanel() {
  return (
    <div className="relative">
    <AppFrame label="Editor">
        <div className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Draft
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <CalendarClock className="h-3.5 w-3.5" /> Scheduled
            </span>
          </div>
          <div className="text-xl font-semibold tracking-tight">Building in public: month one</div>
          <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
          <div className="h-2.5 w-4/5 rounded-full bg-foreground/[0.07]" />
        </div>
      </AppFrame>

      {/* Schedule dialog overlay */}
      <div className="absolute -bottom-16 left-1/2 w-[85%] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-background p-5 shadow-2xl shadow-black/10">
        <p className="text-base font-semibold tracking-tight">Schedule publish</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Pick a date and time.</p>
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Date and time</p>
          <div className="flex h-10 items-center rounded-lg border border-input bg-white px-3 font-mono text-sm tabular-nums">
            2026-07-18 09:00
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <span className="inline-flex h-9 items-center rounded-lg border border-input bg-white px-3 text-sm font-medium">
            Cancel
          </span>
          <span className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm">
            Schedule
          </span>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}

/* ── 3. SEO ───────────────────────────────────────────────── */

function SeoPanel() {
  return (
    <AppFrame label="Dashboard SEO">
      <div className="p-6">
        <p className="text-sm font-semibold">Search result appearance</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Meta title</p>
            <div className="flex items-center rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground md:h-10 md:py-0">
            My blog, writing about building products
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Meta description</p>
            <div className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-muted-foreground">
              Notes on shipping, growth, and the craft of writing online.
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-2.5 border-t border-border/60 pt-5">
          {[
            { label: "RSS feed", meta: "/rss.xml", toggle: true },
            { label: "Sitemap", meta: "/sitemap.xml" },
            { label: "Robots control", meta: "/robots.txt" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="font-mono text-xs text-muted-foreground">{row.meta}</p>
              </div>
              <div className="flex items-center gap-2">
                {row.toggle && (
                  <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-primary px-0.5">
                    <span className="ml-auto h-4 w-4 rounded-full bg-white shadow" />
                  </span>
                )}
                <span className="inline-flex h-8 items-center rounded-lg border border-input bg-white px-3 text-xs font-medium">
                  View
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 4. Subscribers ───────────────────────────────────────── */

function SubscribersPanel() {
  return (
    <AppFrame label="Subscribe">
      <div className="p-6">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
          <p className="text-sm font-semibold text-foreground">Email updates</p>
          <p className="mt-1 text-sm text-muted-foreground">Get an email when new posts are published.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex h-10 w-full items-center rounded-lg border border-input bg-white px-3 text-sm text-muted-foreground sm:flex-1">
              you@example.com
            </div>
            <span className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm sm:min-w-[7.5rem]">
              Subscribe
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Check className="h-4 w-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Welcome email sent</span>, new subscribers are greeted
            automatically.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 5. Analytics ─────────────────────────────────────────── */

function AnalyticsPanel() {
  const pageviews = [0.34, 0.5, 0.42, 0.7, 0.58, 0.86, 0.78];
  const visitors = [0.2, 0.32, 0.27, 0.46, 0.4, 0.6, 0.55];
  const kpis = [
    { label: "Pageviews", value: "3,942", icon: Eye },
    { label: "Visitors", value: "2,481", icon: Users },
    { label: "Bounce Rate", value: "38%", icon: TrendingDown },
    { label: "Avg Duration", value: "1m 24s", icon: TrendingUp },
  ];
  return (
    <AppFrame label="Analytics">
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-medium text-muted-foreground">{k.label}</p>
                <k.icon className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
              </div>
              <p className="mt-1 text-lg font-bold tracking-tight">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-sm font-medium">Traffic</p>
          <p className="text-xs text-muted-foreground">Pageviews and visitors over time.</p>
          <svg viewBox="0 0 400 130" className="mt-2 h-32 w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ps-pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ps-vi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[26, 60, 94].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} className="stroke-border" strokeDasharray="3 3" strokeWidth="1" opacity="0.5" />
            ))}
            <path d={areaPath(pageviews, 400, 130)} fill="url(#ps-pv)" />
            <path d={linePath(pageviews, 400, 130)} fill="none" stroke="oklch(0.6 0.15 145)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={areaPath(visitors, 400, 130)} fill="url(#ps-vi)" />
            <path d={linePath(visitors, 400, 130)} fill="none" stroke="oklch(0.58 0.18 280)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.6_0.15_145)]" /> Pageviews
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.58_0.18_280)]" /> Visitors
            </span>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 6. Custom Domain ─────────────────────────────────────── */

function DomainPanel() {
  return (
    <AppFrame label="Custom domain">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-base font-semibold tracking-tight">
            www.yourblog.com
          </p>
          <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Active
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Automatic SSL</p>
              <p className="text-xs text-muted-foreground">Certificate issued and auto-renewing.</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <Check className="h-3.5 w-3.5" /> Secured
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Your blog is live on your domain.
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

/* ── Chart path helpers ───────────────────────────────────── */

function chartPoints(values: number[], w: number, h: number) {
  const stepX = w / (values.length - 1);
  return values.map((v, i) => [i * stepX, h - v * (h * 0.78)] as const);
}

function linePath(values: number[], w = 320, h = 120) {
  const pts = chartPoints(values, w, h);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const cx = (px + x) / 2;
    d += ` C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }
  return d;
}

function areaPath(values: number[], w = 320, h = 120) {
  const pts = chartPoints(values, w, h);
  return `${linePath(values, w, h)} L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`;
}
