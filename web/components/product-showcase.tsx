"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  List,
  Quote,
  Link2,
  Highlighter,
  ImageIcon,
  Code,
  Check,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Globe,
  FolderTree,
  Zap,
  Bot,
  FileJson2,
  ScrollText,
  ArrowUpRight,
  Palette,
  Sun,
  Moon,
  Monitor,
  Megaphone,
  Webhook,
  Search,
  Layers,
} from "lucide-react";
import { SiYoutube } from "react-icons/si";

const PANELS = [
  {
    key: "editor",
    kicker: "Write",
    title: "A rich editor built for SEO",
    body: "Formatting, images, embeds, and code blocks — plus automatic image optimization, FAQ schema, categories, and multi-author profiles as you write.",
    visual: <EditorPanel />,
  },
  {
    key: "seo",
    kicker: "Get found",
    title: "Technical SEO & AI search, on autopilot",
    body: "Sitemaps, canonicals, JSON-LD, and AI-ready llms.txt generated automatically. Granular noindex controls and auto 301 redirects protect your rankings.",
    visual: <SeoPanel />,
  },
  {
    key: "domain",
    kicker: "Own",
    title: "Your domain, or a /blog subdirectory",
    body: "Go live on an apex domain, subdomain, or mount under yourdomain.com/blog with one-click config for Next.js, Cloudflare, Vercel, Nginx, and more.",
    visual: <DomainPanel />,
  },
  {
    key: "convert",
    kicker: "Grow",
    title: "Turn readers into customers",
    body: "Built-in newsletter forms, end-of-post CTAs, and real-time webhook sync to your ESP or automation tools — no confirmation-email friction.",
    visual: <ConvertPanel />,
  },
  {
    key: "analytics",
    kicker: "Understand",
    title: "Real-time analytics that make sense",
    body: "Live visitors, period-over-period deltas, referrers, and an interactive world map. Privacy-friendly, with CSV export and no setup required.",
    visual: <AnalyticsPanel />,
  },
  {
    key: "design",
    kicker: "Scale",
    title: "Your brand, multiple publications",
    body: "Light/dark modes, brand color tokens, typography pairings, header & footer builders, native Google integrations, and unlimited sites under one account.",
    visual: <DesignPanel />,
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
            Everything a content engine needs, in one place
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

function AppFrame({ label, children, badge }: { label: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_30px_90px_-48px_rgba(15,23,42,0.5)]">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">{label}</span>
        {badge}
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
    { icon: Heading2, on: false },
    { icon: List, on: false },
    { icon: Quote, on: false },
    { icon: Link2, on: false },
    { icon: Code, on: false },
    { icon: Highlighter, on: false },
    { icon: ImageIcon, on: false },
  ];
  return (
    <AppFrame
      label="Editor"
      badge={
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
          <Check className="h-3 w-3" /> SEO optimized
        </span>
      }
    >
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
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground">
          <SiYoutube className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-3 p-6">
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          How we grew organic traffic 4x
          <span className="hero-caret ml-0.5 inline-block h-6 w-[2px] translate-y-1 bg-primary" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[94%] rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[76%] rounded-full bg-foreground/[0.07]" />
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <FileJson2 className="h-3.5 w-3.5" /> FAQ schema
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
        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> Auto-optimized responsive images
          </span>
          <span>Draft saved</span>
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 2. SEO ───────────────────────────────────────────────── */

function SeoPanel() {
  const items = [
    { icon: ScrollText, label: "sitemap.xml", sub: "Auto-generated" },
    { icon: Bot, label: "llms.txt", sub: "AI search ready" },
    { icon: FileJson2, label: "JSON-LD", sub: "BlogPosting · FAQPage" },
    { icon: Zap, label: "Auto 301 redirects", sub: "Slug changes" },
  ];
  return (
    <AppFrame label="SEO & AI Search">
      <div className="p-6">
        <p className="text-sm font-semibold">Search result appearance</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#1a0dab]">How we grew organic traffic 4x in 90 days</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A step-by-step breakdown of our SEO engine — technical foundations, content structure, and the
            measurable results.
          </p>
          <p className="font-mono text-xs text-emerald-600">acme.com/blog/how-we-grew-organic-traffic</p>
        </div>
        <div className="mt-5 space-y-2 border-t border-border/60 pt-5">
          {items.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <row.icon className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.sub}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                <Check className="h-3 w-3" /> Ready
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 3. Domain ────────────────────────────────────────────── */

function DomainPanel() {
  return (
    <AppFrame label="Custom domain & subdirectory">
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-semibold tracking-tight">blog.acme.com</p>
              <p className="text-xs text-muted-foreground">Apex / subdomain · Automatic SSL</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Active
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/[0.03] p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderTree className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-semibold tracking-tight">acme.com/blog</p>
              <p className="text-xs text-muted-foreground">Subdirectory · Reverse proxy</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Live
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {["Next.js", "Cloudflare Worker", "Vercel", "Nginx", "Caddy", "Apache"].map((s) => (
              <span
                key={s}
                className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

/* ── 4. Convert ───────────────────────────────────────────── */

function ConvertPanel() {
  return (
    <AppFrame label="Conversion & Newsletter">
      <div className="space-y-3 p-6">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-sm font-semibold text-foreground">Join the newsletter</p>
          <p className="mt-1 text-xs text-muted-foreground">Get the latest playbooks in your inbox.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex h-10 w-full items-center rounded-lg border border-input bg-white px-3 text-sm text-muted-foreground sm:flex-1">
              you@company.com
            </div>
            <span className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm sm:min-w-[7.5rem]">
              Subscribe
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">End-of-post CTA</p>
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            “Get the full growth framework” — customizable heading, copy, and button.
          </p>
          <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground shadow-sm">
            Get the guide →
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <Webhook className="h-4 w-4" />
          </span>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Real-time webhook sync</span> to Zapier, Make,
            Loops, Beehiiv, and more — no confirmation-email friction.
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
    { label: "Pageviews", value: "3,942", delta: "+18%", up: true, icon: Eye },
    { label: "Visitors", value: "2,481", delta: "+12%", up: true, icon: Users },
    { label: "Bounce Rate", value: "38%", delta: "-5%", up: false, icon: TrendingDown },
    { label: "Avg Duration", value: "1m 24s", delta: "+9%", up: true, icon: TrendingUp },
  ];
  return (
    <AppFrame
      label="Analytics"
      badge={
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          12 online
        </span>
      }
    >
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-medium text-muted-foreground">{k.label}</p>
                <k.icon className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
              </div>
              <p className="mt-1 text-lg font-bold tracking-tight">{k.value}</p>
              <p className={`text-[10px] font-semibold ${k.up ? "text-emerald-600" : "text-red-500"}`}>{k.delta}</p>
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

/* ── 6. Design & Scale ────────────────────────────────────── */

function DesignPanel() {
  return (
    <AppFrame label="Themes & Integrations">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Design system</p>
          <div className="flex gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground">
              <Sun className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Moon className="h-3.5 w-3.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {["#18181b", "#ec4899", "#059669", "#0284c7", "#f97316"].map((c) => (
              <span key={c} className="h-6 w-6 rounded-full border border-border/60" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Brand color tokens</span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Multi-site workspace</p>
          </div>
          <span className="text-xs text-muted-foreground">Unlimited publications</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "GA4", icon: ArrowUpRight },
            { label: "Search Console", icon: Search },
            { label: "AdSense", icon: Globe },
          ].map((i) => (
            <div key={i.label} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
              <i.icon className="h-4 w-4 text-muted-foreground" />
              <p className="mt-1.5 text-xs font-medium">{i.label}</p>
              <p className="text-[10px] text-emerald-600">Connected</p>
            </div>
          ))}
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