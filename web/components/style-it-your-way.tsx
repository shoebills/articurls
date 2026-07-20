"use client";

import { useEffect, useRef, useState } from "react";

const POSTS = [
  { title: "Building in public: month one", date: "Jun 15, 2026" },
  { title: "Why I switched to a simpler stack", date: "Jun 10, 2026" },
  { title: "The art of writing clearly", date: "Jun 5, 2026" },
  { title: "Shipping a blog people actually read", date: "May 28, 2026" },
] as const;

function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-dashed border-border/70 bg-muted/25 ${className}`}>
      <div className="h-full w-full rounded-[5px] bg-gradient-to-br from-muted to-background ring-1 ring-border/60" />
    </div>
  );
}

function MiniHeader() {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
      <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">Field Notes</span>
    </div>
  );
}

function AboutBlock() {
  return (
    <div className="space-y-1.5 text-center">
      <div className="mx-auto h-8 w-8 rounded-full bg-muted-foreground/15" />
      <p className="text-sm font-semibold text-foreground">Alex Rivera</p>
      <p className="mx-auto max-w-[180px] text-xs leading-relaxed text-muted-foreground">
        Thoughts on building, writing, and shipping.
      </p>
    </div>
  );
}

function PostDate({ date }: { date: string }) {
  return <p className="text-xs text-muted-foreground">{date}</p>;
}

function CardGridPost({ title, date }: { title: string; date: string }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-border/70 p-2.5">
      <ImagePlaceholder className="aspect-[3/2] w-full" />
      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      <PostDate date={date} />
    </div>
  );
}

function WideCardGridWithAbout() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="px-4 py-4">
        <AboutBlock />
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-4 py-4">
        <CardGridPost title={POSTS[0].title} date={POSTS[0].date} />
        <CardGridPost title={POSTS[1].title} date={POSTS[1].date} />
        <CardGridPost title={POSTS[2].title} date={POSTS[2].date} />
        <CardGridPost title={POSTS[3].title} date={POSTS[3].date} />
      </div>
    </div>
  );
}

function WideCardGridNoAbout() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="grid grid-cols-2 gap-2.5 px-4 py-4">
        <CardGridPost title={POSTS[0].title} date={POSTS[0].date} />
        <CardGridPost title={POSTS[1].title} date={POSTS[1].date} />
        <CardGridPost title={POSTS[2].title} date={POSTS[2].date} />
        <CardGridPost title={POSTS[3].title} date={POSTS[3].date} />
      </div>
    </div>
  );
}

function SideImageRow({ title, date }: { title: string; date: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          Notes on shipping, growth, and the craft of writing online.
        </p>
        <PostDate date={date} />
      </div>
      <div className="w-16 shrink-0 sm:w-20">
        <ImagePlaceholder className="aspect-[3/2]" />
      </div>
    </div>
  );
}

function WideSideImage() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-5 px-4 py-4">
        <SideImageRow title={POSTS[0].title} date={POSTS[0].date} />
        <SideImageRow title={POSTS[1].title} date={POSTS[1].date} />
      </div>
    </div>
  );
}

function NarrowCenteredPost({ title, date }: { title: string; date: string }) {
  return (
    <div className="space-y-2">
      <ImagePlaceholder className="aspect-[3/2] w-full" />
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          Notes on shipping, growth, and the craft of writing online.
        </p>
        <PostDate date={date} />
      </div>
    </div>
  );
}

function NarrowCentered() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-6 px-8 py-4">
        <NarrowCenteredPost title={POSTS[0].title} date={POSTS[0].date} />
        <NarrowCenteredPost title={POSTS[2].title} date={POSTS[2].date} />
      </div>
    </div>
  );
}

function TextOnly() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-4 px-4 py-4">
        {POSTS.map((p) => (
          <div key={p.title} className="space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
            <PostDate date={p.date} />
          </div>
        ))}
      </div>
    </div>
  );
}

const LAYOUTS = [
  { component: WideCardGridWithAbout, label: "Wide · Card grid · About section" },
  { component: WideCardGridNoAbout, label: "Wide · Card grid · No about section" },
  { component: WideSideImage, label: "Wide · Side image" },
  { component: NarrowCentered, label: "Narrow · Centered" },
  { component: TextOnly, label: "Text-only" },
] as const;

export function StyleItYourWay() {
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">CUSTOMIZE</p>
          <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Style it your way
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Choose the appearance the way you want.
          </p>
        </div>

        <div
          ref={ref}
          data-shown={shown || undefined}
          className="mx-auto mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {LAYOUTS.map(({ component: Preview, label }, i) => (
            <div
              key={label}
              style={{ transitionDelay: `${i * 80}ms` }}
              className="flex flex-col gap-3 opacity-0 translate-y-4 transition-all duration-500 ease-out will-change-transform [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100"
            >
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_30px_90px_-48px_rgba(15,23,42,0.5)]">
                <Preview />
              </div>
              <p className="px-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
