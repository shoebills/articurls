"use client";

import { useEffect, useRef, useState } from "react";

const AUDIENCES = [
  {
    who: "Hobby writers",
    outcome: "Share your words on a home that's truly yours — and just write.",
    span: "sm:col-span-2 lg:col-span-2",
    art: <WriteArt />,
  },
  {
    who: "Developers",
    outcome: "Ship a fast, SEO-ready blog without babysitting servers or plugins.",
    span: "lg:col-span-2",
    art: <DevArt />,
  },
  {
    who: "Indie hackers",
    outcome: "Build an audience and turn readers into subscribers as you launch.",
    span: "",
    art: <IndieArt />,
  },
  {
    who: "Startup founders",
    outcome: "Publish on your own domain and let search bring the right people in.",
    span: "",
    art: <FounderArt />,
  },
  {
    who: "Technical writers",
    outcome: "Focus on the craft while structure, meta, and feeds stay handled.",
    span: "sm:col-span-2 lg:col-span-2",
    art: <TechArt />,
  },
] as const;

export function AudienceSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Who it&apos;s for</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Built for people who&apos;d rather write
          </h2>
        </div>

        <div
          ref={ref}
          data-shown={shown || undefined}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        >
          {AUDIENCES.map((a, i) => (
            <article
              key={a.who}
              style={{ transitionDelay: `${i * 80}ms` }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-6 opacity-0 translate-y-4 transition-all duration-500 ease-out will-change-transform [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_80px_-50px_rgba(15,23,42,0.55)] ${a.span}`}
            >
              <div className="relative mb-6 h-32 overflow-hidden rounded-xl border border-border/60 bg-muted/25">
                {a.art}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{a.who}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.outcome}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── UI-based illustrations ───────────────────────────────── */

function Line({ w, accent }: { w: string; accent?: boolean }) {
  return (
    <div className={`h-2 rounded-full ${accent ? "bg-primary/30" : "bg-foreground/[0.08]"}`} style={{ width: w }} />
  );
}

function WriteArt() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5 p-5">
      <div className="text-sm font-semibold tracking-tight text-foreground/80">
        My first post
        <span className="hero-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-primary" />
      </div>
      <Line w="100%" />
      <Line w="86%" />
      <Line w="94%" />
      <Line w="60%" accent />
    </div>
  );
}

function DevArt() {
  const lines = [
    { indent: 0, w: "55%", accent: true },
    { indent: 1, w: "70%" },
    { indent: 1, w: "48%" },
    { indent: 0, w: "38%", accent: true },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 font-mono">
      {lines.map((l, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${l.indent * 16}px` }}>
          <span className="text-[10px] tabular-nums text-muted-foreground/40">{i + 1}</span>
          <div
            className={`h-2 rounded-full ${l.accent ? "bg-primary/30" : "bg-foreground/[0.08]"}`}
            style={{ width: l.w }}
          />
        </div>
      ))}
      <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Deployed
      </div>
    </div>
  );
}

function IndieArt() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-3 p-5">
      <div className="flex items-end gap-1.5">
        {[30, 42, 38, 58, 52, 74].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-primary/25" style={{ height: `${h * 0.5}px` }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Subscribers</span>
        <span className="text-sm font-semibold tracking-tight text-foreground">+128</span>
      </div>
    </div>
  );
}

function FounderArt() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5 p-5">
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2">
        <span className="truncate text-xs font-medium">yourstartup.com</span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="hero-ping absolute inset-0 rounded-full bg-primary/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-muted-foreground">
          <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <Line w="60%" />
      </div>
    </div>
  );
}

function TechArt() {
  return (
    <div className="absolute inset-0 flex items-center gap-5 p-5">
      <div className="flex-1 space-y-2">
        <Line w="70%" accent />
        <Line w="100%" />
        <Line w="92%" />
        <div className="pl-4">
          <Line w="60%" />
        </div>
        <div className="pl-4">
          <Line w="52%" />
        </div>
      </div>
      <div className="hidden w-24 shrink-0 space-y-1.5 border-l border-border/60 pl-4 sm:block">
        {["Intro", "Setup", "API", "FAQ"].map((s, i) => (
          <div
            key={s}
            className={`text-[11px] ${i === 0 ? "font-medium text-primary" : "text-muted-foreground/60"}`}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
