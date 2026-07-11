"use client";

import { useEffect, useRef, useState } from "react";

type Cell = { text: string; tone: "good" | "mixed" | "weak" };

const ROWS: { label: string; values: Record<string, Cell> }[] = [
  {
    label: "Ownership",
    values: {
      Articurls: { text: "Your domain, your content", tone: "good" },
      WordPress: { text: "You self-host it", tone: "mixed" },
      Ghost: { text: "You self-host it", tone: "mixed" },
      Medium: { text: "On their platform", tone: "weak" },
      Notion: { text: "On their platform", tone: "weak" },
    },
  },
  {
    label: "Maintenance",
    values: {
      Articurls: { text: "None — fully managed", tone: "good" },
      WordPress: { text: "Updates & plugins", tone: "weak" },
      Ghost: { text: "Server upkeep", tone: "weak" },
      Medium: { text: "None", tone: "good" },
      Notion: { text: "None", tone: "good" },
    },
  },
  {
    label: "SEO",
    values: {
      Articurls: { text: "Built-in & automatic", tone: "good" },
      WordPress: { text: "Needs plugins", tone: "mixed" },
      Ghost: { text: "Good defaults", tone: "good" },
      Medium: { text: "Limited control", tone: "weak" },
      Notion: { text: "Not built for it", tone: "weak" },
    },
  },
  {
    label: "Custom domain",
    values: {
      Articurls: { text: "Included + auto SSL", tone: "good" },
      WordPress: { text: "Yes, you configure", tone: "mixed" },
      Ghost: { text: "Yes, you configure", tone: "mixed" },
      Medium: { text: "Paid, restricted", tone: "weak" },
      Notion: { text: "Third-party only", tone: "weak" },
    },
  },
  {
    label: "Analytics",
    values: {
      Articurls: { text: "Built-in", tone: "good" },
      WordPress: { text: "Plugin required", tone: "mixed" },
      Ghost: { text: "Basic + add-ons", tone: "mixed" },
      Medium: { text: "Platform stats", tone: "mixed" },
      Notion: { text: "None", tone: "weak" },
    },
  },
  {
    label: "Subscriber emails",
    values: {
      Articurls: { text: "Built-in", tone: "good" },
      WordPress: { text: "Plugin required", tone: "mixed" },
      Ghost: { text: "Built-in", tone: "good" },
      Medium: { text: "Followers only", tone: "mixed" },
      Notion: { text: "None", tone: "weak" },
    },
  },
  {
    label: "Setup time",
    values: {
      Articurls: { text: "Minutes", tone: "good" },
      WordPress: { text: "Hours to days", tone: "weak" },
      Ghost: { text: "Hours", tone: "mixed" },
      Medium: { text: "Minutes", tone: "good" },
      Notion: { text: "Minutes", tone: "good" },
    },
  },
];

const COMPETITORS = ["WordPress", "Ghost", "Medium", "Notion"] as const;

function toneClass(tone: Cell["tone"]) {
  if (tone === "good") return "text-foreground";
  if (tone === "mixed") return "text-muted-foreground";
  return "text-muted-foreground/60";
}

function Dot({ tone }: { tone: Cell["tone"] }) {
  const color =
    tone === "good" ? "bg-primary" : tone === "mixed" ? "bg-muted-foreground/40" : "bg-muted-foreground/20";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

export function ComparisonSection() {
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How it compares</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            A blog you own, without the busywork
          </h2>
        </div>

        {/* Desktop table */}
        <div
          ref={ref}
          data-shown={shown || undefined}
          className="mt-14 hidden lg:block"
        >
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card">
            {/* Articurls highlight column */}
            <div className="pointer-events-none absolute inset-y-0 left-[calc(28%+0px)] w-[18%] rounded-2xl bg-primary/[0.05] ring-1 ring-inset ring-primary/20" />

            <div className="relative grid grid-cols-[28%_18%_repeat(4,minmax(0,1fr))]">
              {/* Header */}
              <div className="border-b border-border/60 px-6 py-5" />
              <div className="border-b border-primary/20 px-4 py-5 text-center">
                <p className="text-base font-semibold tracking-tight text-primary">Articurls</p>
              </div>
              {COMPETITORS.map((c) => (
                <div key={c} className="border-b border-border/60 px-4 py-5 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{c}</p>
                </div>
              ))}

              {/* Rows */}
              {ROWS.map((row, ri) => (
                <div
                  key={row.label}
                  className="col-span-6 grid grid-cols-[28%_18%_repeat(4,minmax(0,1fr))] opacity-0 translate-y-3 transition-all duration-500 ease-out [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100"
                  style={{ transitionDelay: `${ri * 70}ms` }}
                >
                  <div className={`px-6 py-4 text-sm font-medium ${ri === ROWS.length - 1 ? "" : "border-b border-border/50"}`}>
                    {row.label}
                  </div>
                  <div className={`flex items-center justify-center gap-2 px-4 py-4 text-center text-sm font-medium text-foreground ${ri === ROWS.length - 1 ? "" : "border-b border-primary/15"}`}>
                    <Dot tone={row.values.Articurls.tone} />
                    {row.values.Articurls.text}
                  </div>
                  {COMPETITORS.map((c) => (
                    <div
                      key={c}
                      className={`flex items-center justify-center gap-2 px-4 py-4 text-center text-sm ${toneClass(
                        row.values[c].tone
                      )} ${ri === ROWS.length - 1 ? "" : "border-b border-border/50"}`}
                    >
                      <Dot tone={row.values[c].tone} />
                      {row.values[c].text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile / tablet: swipe cards */}
        <div className="mt-12 lg:hidden">
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SwipeCard name="Articurls" highlight />
            {COMPETITORS.map((c) => (
              <SwipeCard key={c} name={c} />
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">Swipe to compare →</p>
        </div>
      </div>
    </section>
  );
}

function SwipeCard({ name, highlight }: { name: string; highlight?: boolean }) {
  return (
    <div
      className={`w-[78%] max-w-xs shrink-0 snap-center rounded-2xl border p-5 ${
        highlight ? "border-primary/30 bg-gradient-to-b from-primary/[0.05] to-card" : "border-border/70 bg-card"
      }`}
    >
      <p className={`text-base font-semibold tracking-tight ${highlight ? "text-primary" : "text-foreground"}`}>
        {name}
      </p>
      <dl className="mt-4 space-y-3">
        {ROWS.map((row) => {
          const cell = row.values[name];
          return (
            <div key={row.label} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {row.label}
              </dt>
              <dd className={`mt-0.5 flex items-center gap-2 text-sm font-medium ${toneClass(cell.tone)}`}>
                <Dot tone={cell.tone} />
                {cell.text}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
