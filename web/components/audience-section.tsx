"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ShoppingBag, Briefcase, Newspaper, Code2, Mail } from "lucide-react";

const AUDIENCES = [
  {
    who: "B2B SaaS & startups",
    outcome: "Mount your blog on /blog, compound domain authority, and convert readers with product CTAs.",
    icon: Building2,
  },
  {
    who: "E-commerce & consumer brands",
    outcome: "Publish fast buying guides and editorial content with FAQ rich snippets and brand theming.",
    icon: ShoppingBag,
  },
  {
    who: "Agencies & multi-brand teams",
    outcome: "Manage unlimited client publications and switch sites from a single account.",
    icon: Briefcase,
  },
  {
    who: "Media & niche publishers",
    outcome: "Run multi-author publications with category hubs, scheduling, and native AdSense support.",
    icon: Newspaper,
  },
  {
    who: "Developers & technical writers",
    outcome: "Clean code blocks, zero CMS maintenance, custom CSS injection, and instant cache purging.",
    icon: Code2,
  },
  {
    who: "Creators & newsletter operators",
    outcome: "Capture subscribers on-site and sync them to your ESP or automation tools via webhooks.",
    icon: Mail,
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
            Built for teams that publish to grow
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            From B2B SaaS to consumer brands, Articurls gives every publisher the same SEO-native engine —
            without an engineering team.
          </p>
        </div>

        <div
          ref={ref}
          data-shown={shown || undefined}
          className="mx-auto mt-14 flex max-w-4xl flex-wrap justify-center gap-4 sm:gap-5"
        >
          {AUDIENCES.map((a, i) => (
            <article
              key={a.who}
              style={{ transitionDelay: `${i * 80}ms` }}
              className="group flex w-full flex-col items-center rounded-2xl border border-border/70 bg-card p-6 text-center opacity-0 translate-y-4 transition-all duration-500 ease-out will-change-transform [[data-shown]_&]:translate-y-0 [[data-shown]_&]:opacity-100 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_80px_-50px_rgba(15,23,42,0.55)] sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-500 group-hover:scale-105">
                <a.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{a.who}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.outcome}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}