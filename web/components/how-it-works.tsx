"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe, PenLine, TrendingUp } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Connect your domain or /blog",
    body: "Start on a free .articurls.site address, then go live on your apex domain, subdomain, or a /blog subdirectory with copy-paste config for any stack.",
    icon: Globe,
    visual: <ClaimVisual />,
  },
  {
    n: "02",
    title: "Write, structure & optimize",
    body: "Draft in a rich editor with auto-optimized images, FAQ schema, categories, and multi-author profiles. Technical SEO is handled as you type.",
    icon: PenLine,
    visual: <WriteVisual />,
  },
  {
    n: "03",
    title: "Rank, convert & scale",
    body: "Auto sitemaps, llms.txt, and JSON-LD bring search traffic. Conversion CTAs, newsletter webhooks, and real-time analytics turn it into growth.",
    icon: TrendingUp,
    visual: <GrowVisual />,
  },
] as const;

export function HowItWorks() {
  const [active, setActive] = useState<number[]>([]);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            setActive((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
          }
        });
      },
      { rootMargin: "0px 0px -22% 0px", threshold: 0.35 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const progress = active.length === 0 ? 0 : (Math.max(...active) + 1) / STEPS.length;

  return (
    <section
      id="how-it-works"
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Live in three steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            From zero to a ranking, conversion-ready publication — no plugins, servers, or engineering
            sprints.
          </p>
        </div>

        <div className="relative mt-16">
          <div
            className="pointer-events-none absolute left-[27px] top-2 bottom-2 w-px bg-border sm:left-1/2 sm:-translate-x-1/2"
            aria-hidden
          >
            <div
              className="absolute inset-x-0 top-0 origin-top bg-gradient-to-b from-primary to-primary/40 transition-[height] duration-700 ease-out"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <ol className="space-y-14 sm:space-y-24">
            {STEPS.map((step, i) => {
              const shown = active.includes(i);
              const flip = i % 2 === 1;
              return (
                <li
                  key={step.n}
                  data-idx={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className={`relative grid grid-cols-[56px_1fr] items-center gap-x-4 gap-y-5 transition-all duration-700 ease-out sm:grid-cols-2 sm:gap-x-16 ${
                    shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
                >
                  <span
                    className={`z-10 col-start-1 row-start-1 flex h-14 w-14 items-center justify-center rounded-2xl border bg-card text-primary shadow-sm transition-all duration-500 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 ${
                      shown ? "border-primary/40 scale-100" : "border-border scale-90"
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </span>

                  <div
                    className={`col-start-2 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto ${
                      flip ? "sm:order-2 sm:pl-12 sm:text-left" : "sm:pr-12 sm:text-right"
                    }`}
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] text-primary">{step.n}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{step.title}</h3>
                    <p
                      className={`mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base ${
                        flip ? "" : "sm:ml-auto"
                      } max-w-sm`}
                    >
                      {step.body}
                    </p>
                  </div>

                  <div
                    className={`col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:row-start-auto ${
                      flip ? "sm:order-1 sm:pr-12" : "sm:pl-12"
                    }`}
                  >
                    <div
                      className={`group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_24px_80px_-46px_rgba(15,23,42,0.5)] transition-all duration-700 ${
                        shown ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
                      }`}
                    >
                      {step.visual}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Chrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function ClaimVisual() {
  return (
    <div aria-hidden>
      <Chrome label="Connect your domain" />
      <div className="space-y-3 p-5">
        <p className="text-xs font-medium text-muted-foreground">Subdirectory route</p>
        <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-primary/30 ring-4 ring-primary/10 transition-[box-shadow] group-hover:ring-primary/20">
          <span className="flex h-11 items-center bg-muted/60 pl-3 pr-1 text-sm font-medium text-foreground">
            acme.com
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-px bg-primary group-hover:animate-pulse" />
            /
          </span>
          <span className="flex h-11 flex-1 items-center pr-3 text-sm text-muted-foreground">blog</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Next.js", "Cloudflare", "Vercel", "Nginx"].map((s) => (
            <span
              key={s}
              className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3.5 w-3.5" /> Live with automatic SSL
        </div>
      </div>
    </div>
  );
}

function WriteVisual() {
  return (
    <div aria-hidden>
      <Chrome label="Editor" />
      <div className="space-y-3 p-5">
        <div className="text-base font-semibold tracking-tight text-foreground">
          Our SEO growth playbook
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary group-hover:animate-pulse" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[90%] rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-2/3 rounded-full bg-foreground/[0.07]" />
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/25 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">FAQ schema</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Auto-generated
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full bg-foreground/[0.09]" />
            <div className="h-2 w-2/3 rounded-full bg-foreground/[0.06]" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] font-medium text-muted-foreground">Draft saved · SEO ready</span>
          <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
            Publish
          </span>
        </div>
      </div>
    </div>
  );
}

function GrowVisual() {
  const pageviews = [0.34, 0.5, 0.42, 0.7, 0.58, 0.86, 0.78];
  const visitors = [0.2, 0.32, 0.27, 0.46, 0.4, 0.6, 0.55];
  return (
    <div aria-hidden>
      <Chrome label="Analytics" />
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">Organic visitors</p>
            <p className="text-lg font-bold tracking-tight">4,812</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">Conversion rate</p>
            <p className="text-lg font-bold tracking-tight">4.7%</p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-medium text-muted-foreground">Search traffic · Last 7 days</p>
          <svg viewBox="0 0 320 120" className="mt-1 h-24 w-full overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hiw-pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="hiw-vi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[24, 52, 80].map((y) => (
              <line key={y} x1="0" y1={y} x2="320" y2={y} className="stroke-border" strokeDasharray="3 3" strokeWidth="1" opacity="0.5" />
            ))}
            <path d={areaPath(pageviews)} fill="url(#hiw-pv)" />
            <path d={linePath(pageviews)} fill="none" stroke="oklch(0.6 0.15 145)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={areaPath(visitors)} fill="url(#hiw-vi)" />
            <path d={linePath(visitors)} fill="none" stroke="oklch(0.58 0.18 280)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.6_0.15_145)]" /> Visitors
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[oklch(0.58_0.18_280)]" /> Subscribers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function chartPoints(values: number[]) {
  const w = 320;
  const stepX = w / (values.length - 1);
  return values.map((v, i) => [i * stepX, 100 - v * 78] as const);
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
  return `${linePath(values)} L ${pts[pts.length - 1][0]} 120 L ${pts[0][0]} 120 Z`;
}