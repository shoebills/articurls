"use client";

import { useEffect, useRef, useState } from "react";

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, shown };
}

export function BentoGrid() {
  const { ref, shown } = useInView<HTMLDivElement>();

  return (
    <section className="px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Everything included</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            One platform. No plugins.
          </h2>
        </div>

        <div
          ref={ref}
          data-shown={shown || undefined}
          className="mt-14 grid auto-rows-[13rem] grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <Card title="Writing editor" span="lg:col-span-2 lg:row-span-2" delay={0}>
            <EditorMock />
          </Card>

          <Card title="SEO built-in" span="lg:col-span-2" delay={60}>
            <SeoMock />
          </Card>

          <Card title="Custom domains" accent span="lg:col-span-1" delay={120}>
            <DomainMock />
          </Card>

          <Card title="Analytics" span="lg:col-span-1" delay={180}>
            <AnalyticsMock />
          </Card>

          <Card title="Subscribers" span="lg:col-span-2 lg:row-span-2" delay={240}>
            <SubscribersMock />
          </Card>

          <Card title="Scheduling" span="lg:col-span-1" delay={300}>
            <ScheduleMock />
          </Card>

          <Card title="Pages" span="lg:col-span-1" delay={360}>
            <PagesMock />
          </Card>

          <Card title="Categories" span="lg:col-span-1" delay={420}>
            <CategoriesMock />
          </Card>

          <Card title="Responsive images" span="lg:col-span-1" delay={480}>
            <ImagesMock />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({
  title,
  children,
  span,
  accent,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  span?: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 opacity-0 translate-y-4 transition-all duration-700 ease-out [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100 hover:shadow-[0_24px_70px_-46px_rgba(15,23,42,0.5)] ${
        accent ? "border-primary/30 bg-gradient-to-b from-primary/[0.04] to-card" : "border-border/70"
      } ${span ?? ""}`}
    >
      <p className="text-sm font-semibold tracking-tight text-foreground">{title}</p>
      <div className="relative mt-4 min-h-0 flex-1">{children}</div>
    </div>
  );
}

/* ── Mini mocks ───────────────────────────────────────────── */

function Bar({ w, tone = "muted" }: { w: string; tone?: "muted" | "text" }) {
  return (
    <div
      className={`h-2 rounded-full ${tone === "text" ? "bg-foreground/[0.12]" : "bg-foreground/[0.06]"}`}
      style={{ width: w }}
    />
  );
}

function EditorMock() {
  const tools = ["B", "I", "H", "“", "•"];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center gap-1 border-b border-border/60 px-2.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-xs font-bold text-secondary-foreground">
          B
        </span>
        {tools.slice(1).map((t, i) => (
          <span key={i} className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-medium text-muted-foreground">
            {t}
          </span>
        ))}
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <div className="flex-1 space-y-2.5 p-4">
        <div className="text-lg font-semibold tracking-tight">
          Building in public
          <span className="hero-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary" />
        </div>
        <Bar w="100%" />
        <Bar w="92%" />
        <Bar w="74%" />
        <div className="mt-3 h-16 rounded-lg bg-gradient-to-br from-muted to-background ring-1 ring-border/60" />
        <Bar w="60%" />
      </div>
    </div>
  );
}

function SeoMock() {
  return (
    <div className="flex h-full items-center gap-4">
      <div className="flex-1 space-y-2.5">
        {[
          { k: "Meta title", ok: true },
          { k: "Sitemap", ok: true },
          { k: "Robots", ok: true },
          { k: "JSON-LD", ok: true },
        ].map((r) => (
          <div key={r.k} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 6l3 3 5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="text-xs text-muted-foreground">{r.k}</span>
          </div>
        ))}
      </div>
      <div className="hidden w-40 shrink-0 rounded-xl border border-border/60 bg-background p-3 sm:block">
        <Bar w="70%" tone="text" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-emerald-500/30" />
          <Bar w="90%" />
          <Bar w="60%" />
        </div>
      </div>
    </div>
  );
}

function DomainMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
        <span className="truncate text-xs font-medium">yourblog.com</span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">Active</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-primary">
        <span className="relative flex h-1.5 w-1.5">
          <span className="hero-ping absolute inset-0 rounded-full bg-primary/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        Automatic SSL secured
      </div>
    </div>
  );
}

function AnalyticsMock() {
  const pv = [0.3, 0.5, 0.4, 0.7, 0.6, 0.85];
  const w = 150;
  const h = 60;
  const pts = pv.map((v, i) => `${(i / (pv.length - 1)) * w},${h - v * h * 0.8}`);
  const line = pts.map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(" ");
  return (
    <div className="flex h-full flex-col justify-center">
      <p className="text-2xl font-bold tracking-tight">2,481</p>
      <p className="text-[11px] text-muted-foreground">visitors this week</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-12 w-full" preserveAspectRatio="none">
        <path d={`${line} L ${w},${h} L 0,${h} Z`} fill="oklch(0.58 0.18 280 / 0.12)" />
        <path d={line} fill="none" stroke="oklch(0.58 0.18 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SubscribersMock() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-semibold">Email updates</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Get an email when new posts publish.</p>
        <div className="mt-3 flex gap-2">
          <div className="flex h-8 flex-1 items-center rounded-lg border border-input bg-white px-2.5 text-[11px] text-muted-foreground">
            you@example.com
          </div>
          <span className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-[11px] font-medium text-primary-foreground">
            Subscribe
          </span>
        </div>
      </div>
      <div className="flex flex-1 items-end gap-1.5">
        {[40, 55, 48, 68, 60, 78, 72, 88].map((v, i) => (
          <div key={i} className="flex-1 rounded-sm bg-primary/20" style={{ height: `${v}%` }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>New subscribers</span>
        <span className="font-medium text-foreground">+128</span>
      </div>
    </div>
  );
}

function ScheduleMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Scheduled
      </span>
      <div className="flex h-9 items-center rounded-lg border border-input bg-white px-3 font-mono text-xs tabular-nums text-foreground">
        2026-07-18 09:00
      </div>
      <p className="text-[11px] text-muted-foreground">Goes live automatically.</p>
    </div>
  );
}

function PagesMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      {["About", "Now", "Uses"].map((p, i) => (
        <div
          key={p}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            i === 0 ? "border-primary/30 bg-primary/[0.04]" : "border-border/60 bg-background"
          }`}
        >
          <span className="text-xs font-medium">{p}</span>
          <span className="text-[10px] text-muted-foreground">/{p.toLowerCase()}</span>
        </div>
      ))}
    </div>
  );
}

function CategoriesMock() {
  const cats = ["Engineering", "Design", "Growth", "Notes", "Launches"];
  return (
    <div className="flex h-full flex-wrap content-center gap-2">
      {cats.map((c, i) => (
        <span
          key={c}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            i === 0
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/60 bg-background text-muted-foreground"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function ImagesMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="relative overflow-hidden rounded-lg ring-1 ring-border/60">
        <div className="h-20 bg-gradient-to-br from-primary/15 via-muted to-background" />
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
          WebP · optimized
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Served fast at every size
      </div>
    </div>
  );
}
