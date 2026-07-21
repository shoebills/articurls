"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CUSTOMIZATIONS = [
  { name: "Example 1", src: "/images/example-1.webp" },
  { name: "Example 2", src: "/images/example-2.webp" },
  { name: "Example 3", src: "/images/example-3.webp" },
  { name: "Example 4", src: "/images/example-4.webp" },
] as const;

export function CustomizeSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);
  const [dir, setDir] = useState<"left" | "right">("right");

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    CUSTOMIZATIONS.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  function navigate(to: "prev" | "next") {
    if (exiting !== null) return;
    const d = to === "next" ? "right" : "left";
    const next =
      to === "next"
        ? (active + 1) % CUSTOMIZATIONS.length
        : (active - 1 + CUSTOMIZATIONS.length) % CUSTOMIZATIONS.length;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(next);
      return;
    }

    setDir(d);
    setExiting(active);
    setActive(next);
  }

  function jumpTo(i: number) {
    if (exiting !== null || i === active) return;
    const d = i > active ? "right" : "left";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(i);
      return;
    }

    setDir(d);
    setExiting(active);
    setActive(i);
  }

  return (
    <section
      id="customize"
      ref={sectionRef}
      data-shown={shown || undefined}
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary opacity-0 transition-opacity duration-500 [[data-shown]_&]:opacity-100">
            Customize
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight opacity-0 translate-y-4 transition-all delay-100 duration-500 ease-out sm:text-4xl [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100">
            Style it in your own way
          </h2>
        </div>

        {/* Desktop */}
        <div className="hidden mt-14 opacity-0 translate-y-4 transition-all delay-200 duration-500 ease-out lg:flex lg:items-center lg:gap-5 [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100">
          <ArrowButton dir="left" onClick={() => navigate("prev")} />
          <div className="min-w-0 flex-1">
            <AppFrame>
              <ImageStage
                active={active}
                exiting={exiting}
                direction={dir}
                onTransitionEnd={() => setExiting(null)}
              />
            </AppFrame>
          </div>
          <ArrowButton dir="right" onClick={() => navigate("next")} />
        </div>

        {/* Mobile */}
        <div className="mt-14 opacity-0 translate-y-4 transition-all delay-200 duration-500 ease-out lg:hidden flex flex-col items-center gap-5 w-full [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100">
          <AppFrame>
            <ImageStage
              active={active}
              exiting={exiting}
              direction={dir}
              onTransitionEnd={() => setExiting(null)}
            />
          </AppFrame>
          <div className="flex justify-center gap-3">
            <ArrowButton dir="left" onClick={() => navigate("prev")} />
            <ArrowButton dir="right" onClick={() => navigate("next")} />
          </div>
        </div>

        {/* Dot pagination */}
        <div className="mt-6 flex justify-center gap-2 opacity-0 transition-opacity delay-300 duration-500 [[data-shown]_&]:opacity-100">
          {CUSTOMIZATIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                i === active
                  ? "w-6 bg-primary"
                  : "w-2 bg-foreground/15 hover:bg-foreground/30"
              }`}
              aria-label={`Show ${CUSTOMIZATIONS[i].name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArrowButton({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground/60 shadow-sm transition-all duration-200 ease-out hover:border-primary/30 hover:bg-muted hover:text-foreground active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={dir === "left" ? "Previous customization" : "Next customization"}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_30px_90px_-48px_rgba(15,23,42,0.5)]">
      {children}
    </div>
  );
}

function ImageStage({
  active,
  exiting,
  direction,
  onTransitionEnd,
}: {
  active: number;
  exiting: number | null;
  direction: "left" | "right";
  onTransitionEnd: () => void;
}) {
  return (
    <div className="relative aspect-[25/18] overflow-hidden bg-muted/20">
      {CUSTOMIZATIONS.map((customization, index) => {
        const isEntering = exiting !== null && index === active;
        const isExiting = index === exiting;
        const className = isEntering
          ? "customize-entering z-10 animate-customize-enter"
          : isExiting
            ? "customize-exiting z-0 animate-customize-exit"
            : index === active
              ? "z-0 opacity-100"
              : "opacity-0";
        const enterOffset = direction === "right" ? "64px" : "-64px";
        const exitOffset = direction === "right" ? "-64px" : "64px";

        return (
          <div
            key={customization.src}
            className={`absolute inset-0 ${className}`}
            style={
              isEntering
                ? ({ "--enter-offset": enterOffset } as React.CSSProperties)
                : isExiting
                  ? ({ "--exit-offset": exitOffset } as React.CSSProperties)
                  : undefined
            }
            onAnimationEnd={isEntering ? onTransitionEnd : undefined}
          >
            <img
              src={customization.src}
              alt={customization.name}
              className="h-full w-full object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}
