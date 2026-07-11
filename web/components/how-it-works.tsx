"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, BarChart3, Check, PenLine } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Claim your username",
    body: "Pick your handle and your blog is live in seconds — on your own domain when you're ready.",
    icon: AtSign,
    visual: <ClaimVisual />,
  },
  {
    n: "02",
    title: "Write & publish",
    body: "Draft in a calm editor, schedule it, and ship. No plugins, no setup, no maintenance.",
    icon: PenLine,
    visual: <WriteVisual />,
  },
  {
    n: "03",
    title: "Own & grow",
    body: "Your domain, your subscribers, your analytics. Watch readers arrive and keep them.",
    icon: BarChart3,
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
      <Chrome label="Create your blog" />
      <div className="space-y-3 p-5">
        <p className="text-xs font-medium text-muted-foreground">Your address</p>
        <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-primary/30 ring-4 ring-primary/10 transition-[box-shadow] group-hover:ring-primary/20">
          <span className="flex h-11 items-center pl-3 pr-1 text-muted-foreground">
            <AtSign className="h-4 w-4" />
          </span>
          <span className="flex h-11 flex-1 items-center text-sm font-medium text-foreground">yourname</span>
          <span className="flex h-11 items-center bg-muted/60 px-3 text-sm text-muted-foreground">
            .articurls.com
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3.5 w-3.5" /> Available
        </div>
      </div>
    </div>
  );
}

function WriteVisual() {
  return (
    <div aria-hidden>
      <Chrome label="Editor — Untitled draft" />
      <div className="space-y-3 p-5">
        <div className="text-base font-semibold tracking-tight text-foreground">
          My first post
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary group-hover:animate-pulse" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-[90%] rounded-full bg-foreground/[0.07]" />
        <div className="h-2.5 w-2/3 rounded-full bg-foreground/[0.07]" />
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[11px] font-medium text-muted-foreground">Draft saved</span>
          <span className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
            Publish
          </span>
        </div>
      </div>
    </div>
  );
}

function GrowVisual() {
  return (
    <div aria-hidden>
      <Chrome label="yourname.com — Analytics" />
      <div className="space-y-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Readers this month</p>
            <p className="text-2xl font-semibold tracking-tight">2,481</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <BarChart3 className="h-3.5 w-3.5" /> Growing
          </span>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {[34, 46, 40, 58, 52, 70, 64, 82].map((h, i) => (
            <div
              key={i}
              className="flex-1 origin-bottom rounded-sm bg-primary/75 transition-transform duration-500 group-hover:scale-y-105"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
