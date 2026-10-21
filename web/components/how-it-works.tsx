"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Globe, PenLine, TrendingUp } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Connect your domain",
    body: "Start on a free .articurls.site address, then go live on your apex domain, subdomain, or a /blog subdirectory.",
    icon: Globe,
    visual: <ClaimVisual />,
  },
  {
    n: "02",
    title: "Write, structure & optimize",
    body: "Draft in a rich editor with auto-optimized images, FAQ, categories, and multi-author profiles. Technical SEO is handled as you type.",
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
            From zero to a ranking, conversion-ready publication.
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
        <p className="text-xs font-medium text-muted-foreground">Subdirectory</p>
        <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-primary/30 ring-4 ring-primary/10 transition-[box-shadow] group-hover:ring-primary/20">
          <span className="flex h-11 items-center bg-muted/60 pl-3 pr-1 text-sm font-medium text-foreground">
            acme.com
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-px bg-primary group-hover:animate-pulse" />
            /
          </span>
          <span className="flex h-11 flex-1 items-center pr-3 text-sm text-muted-foreground">blog</span>
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
          <span className="text-[11px] font-medium text-muted-foreground">FAQ</span>
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-3/4 rounded-full bg-foreground/[0.09]" />
            <div className="h-2 w-2/3 rounded-full bg-foreground/[0.06]" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] font-medium text-muted-foreground">Draft saved</span>
          <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-transform group-hover:-translate-y-0.5">
            Publish
          </span>
        </div>
      </div>
    </div>
  );
}

function GrowVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const visitors = [420, 560, 510, 680, 640, 980, 1022];
  const signups = [64, 71, 66, 89, 84, 128, 118];
  const visitorMax = 1500;
  const signupMax = 200;
  const satVisitor = chartPoints(visitors, visitorMax)[5];
  const satSignup = chartPoints(signups, signupMax)[5];

  return (
    <div aria-hidden>
      <Chrome label="Analytics" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">Traffic &amp; conversions</p>
          <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            <CalendarDays className="h-3 w-3" /> Last 7 days
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.6_0.15_145)]" /> Organic visitors
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <p className="text-lg font-bold tracking-tight">4,812</p>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> 18.2%
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.58_0.18_280)]" /> Newsletter signups
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <p className="text-lg font-bold tracking-tight">620</p>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                <ArrowUpRight className="h-3 w-3" /> 12.4%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex h-[92px] flex-col justify-between text-right text-[9px] leading-none text-muted-foreground/60">
            <span>1.5k</span>
            <span>1k</span>
            <span>500</span>
            <span>0</span>
          </div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute left-[83%] top-0 z-10 -translate-x-[105%] rounded-md border border-border/70 bg-popover px-2 py-1 shadow-sm">
              <p className="text-[9px] font-semibold leading-tight text-foreground">980 visitors</p>
              <p className="text-[8px] leading-tight text-muted-foreground">128 signups · Sat</p>
            </div>
            <span className="pointer-events-none absolute left-[83%] top-0 h-[92px] border-l border-dashed border-border/80" />
            <svg viewBox="0 0 320 100" className="h-[92px] w-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="hiw-pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="hiw-vi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="oklch(0.58 0.18 280)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[500, 1000].map((v) => {
                const y = 100 - (v / visitorMax) * 100;
                return (
                  <line key={v} x1="0" y1={y} x2="320" y2={y} className="stroke-border" strokeDasharray="3 3" strokeWidth="1" opacity="0.5" />
                );
              })}
              <path d={areaPath(visitors, visitorMax)} fill="url(#hiw-pv)" />
              <path d={linePath(visitors, visitorMax)} fill="none" stroke="oklch(0.6 0.15 145)" strokeWidth="2.5" strokeLinecap="round" />
              <path d={areaPath(signups, signupMax)} fill="url(#hiw-vi)" />
              <path d={linePath(signups, signupMax)} fill="none" stroke="oklch(0.58 0.18 280)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={satVisitor[0]} cy={satVisitor[1]} r="3" fill="var(--card)" stroke="oklch(0.6 0.15 145)" strokeWidth="2.5" />
              <circle cx={satSignup[0]} cy={satSignup[1]} r="3" fill="var(--card)" stroke="oklch(0.58 0.18 280)" strokeWidth="2.5" />
            </svg>
            <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/60">
              {days.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
          <div className="flex h-[92px] flex-col justify-between text-left text-[9px] leading-none text-[oklch(0.58_0.18_280)]/70">
            <span>200</span>
            <span>100</span>
            <span>0</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-foreground">/how-we-grew-organic-traffic</p>
            <p className="text-[9px] text-muted-foreground">Top converting post</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <ArrowUpRight className="h-3 w-3" /> 46 signups
          </span>
        </div>
      </div>
    </div>
  );
}

function chartPoints(values: number[], max: number, w = 320, h = 100) {
  const stepX = w / (values.length - 1);
  return values.map((v, i) => [i * stepX, h - (v / max) * h] as const);
}

function linePath(values: number[], max: number) {
  const pts = chartPoints(values, max);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const cx = (px + x) / 2;
    d += ` C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }
  return d;
}

function areaPath(values: number[], max: number) {
  const pts = chartPoints(values, max);
  return `${linePath(values, max)} L ${pts[pts.length - 1][0]} 100 L ${pts[0][0]} 100 Z`;
}