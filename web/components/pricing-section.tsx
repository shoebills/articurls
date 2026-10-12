"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appAuthHref } from "@/lib/env";
import { useAuth } from "@/lib/auth-context";

type Plan = {
  name: string;
  tagline: string;
  price: string;
  unit: string;
  was?: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
  premium?: boolean;
  note?: string;
};

const PRO_TIERS = [
  { label: "10K", name: "Pro 10K", price: 19, views: "10,000 monthly pageviews" },
  { label: "50K", name: "Pro 50K", price: 39, views: "50,000 monthly pageviews" },
  { label: "100K", name: "Pro 100K", price: 69, views: "100,000 monthly pageviews" },
  { label: "250K", name: "Pro 250K", price: 119, views: "250,000 monthly pageviews" },
  { label: "500K", name: "Pro 500K", price: 199, views: "500,000 monthly pageviews" },
  { label: "Unlimited", name: "Pro Unlimited", price: 249, views: "Unlimited monthly pageviews (no quota)" },
];

export function PricingSection() {
  const { token } = useAuth();
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const signupUrl = appAuthHref("/signup");
  const billingUrl = appAuthHref("/dashboard/billing");
  const lifetimeHref = token ? `${billingUrl}?plan=lifetime` : `${signupUrl}?plan=lifetime`;

  const currentTier = PRO_TIERS[selectedTierIdx];

  const plans: { plan: Plan; tierSelector?: React.ReactNode }[] = [
    {
      plan: {
        name: currentTier.name,
        tagline: "Grow audience",
        price: `$${currentTier.price}`,
        unit: "/mo",
        desc: "Due today: $0 · 7-day free trial",
        features: [
          currentTier.views,
          "Unlimited sites & publications",
          "Unlimited posts & pages",
          "Unlimited media storage",
          "Custom domain with automatic SSL",
          "Collect email subscribers",
          "Pageviews & visitor analytics",
          "Subscriber analytics",
          "RSS feed, sitemap & robots.txt",
          "Custom favicon & code injection",
          "Post scheduling & categories",
          "Search engine optimization",
        ],
        cta: "Start for free",
        href: `${signupUrl}?plan=pro`,
        featured: true,
      },
      tierSelector: (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Select Traffic Allowance</span>
            <span className="text-foreground normal-case font-bold">{currentTier.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 border border-border/60">
            {PRO_TIERS.map((tier, idx) => (
              <button
                key={tier.label}
                type="button"
                onClick={() => setSelectedTierIdx(idx)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                  selectedTierIdx === idx
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      plan: {
        name: "Lifetime",
        tagline: "Own forever",
        price: "$99",
        unit: " once",
        was: "$149",
        desc: "Pay one time. Keep Pro for lifetime.",
        features: [
          "100,000 monthly pageviews",
          "Everything in Pro",
          "No recurring charges, ever",
          "Future Pro features included",
          "Yours for life",
        ],
        cta: "Get Lifetime",
        href: lifetimeHref,
        premium: true,
        note: "Limited time deal",
      },
    },
  ];

  return (
    <section
      id="pricing"
      className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pb-20 pr-[max(1rem,env(safe-area-inset-right))] pt-24 sm:px-6 sm:pb-28 sm:pt-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Start with a 7-day free trial.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            All paid tiers include every feature. Pick the traffic allowance that fits your audience.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl items-start gap-5 md:grid-cols-2">
          {plans.map(({ plan, tierSelector }) => (
            <PlanCard key={plan.name} plan={plan} tierSelector={tierSelector} />
          ))}
        </div>
      </div>

      <StickyCta href={`${signupUrl}?plan=pro`} />
    </section>
  );
}

function PlanCard({ plan, tierSelector }: { plan: Plan; tierSelector?: React.ReactNode }) {
  const base =
    "relative flex flex-col rounded-2xl border p-6 transition-shadow duration-300 sm:p-7";
  const variant = plan.premium
    ? "border-transparent bg-foreground text-background shadow-2xl shadow-black/20"
    : plan.featured
      ? "border-primary/30 bg-gradient-to-b from-primary/[0.05] to-card ring-1 ring-primary/20 shadow-xl shadow-primary/10"
      : "border-border/70 bg-card";

  const mutedText = plan.premium ? "text-background/60" : "text-muted-foreground";
  const checkColor = plan.premium ? "text-background/70" : plan.featured ? "text-primary" : "text-foreground/50";

  return (
    <div className={`${base} ${variant} ${plan.featured ? "lg:-translate-y-3" : ""}`}>
      {plan.premium && (
        <span className="badge-vibrate absolute right-5 top-5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black">
          10 seats left
        </span>
      )}

      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${plan.featured ? "text-primary" : mutedText}`}>
        {plan.tagline}
      </p>
      <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">{plan.name}</h3>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
        <span className={`text-base font-normal ${mutedText}`}>{plan.unit}</span>
        {plan.was && (
          <span className={`ml-1 text-sm line-through ${mutedText}`}>{plan.was}</span>
        )}
      </div>
      <p className={`mt-3 text-sm leading-relaxed ${mutedText}`}>{plan.desc}</p>

      {tierSelector}

      <Button
        className={`mt-6 h-12 w-full ${
          plan.premium
            ? "bg-background text-foreground hover:bg-background/90"
            : plan.featured
              ? "shadow-md shadow-primary/20"
              : ""
        }`}
        variant={plan.featured || plan.premium ? "default" : "outline"}
        asChild
      >
        <a href={plan.href}>{plan.cta}</a>
      </Button>
      {plan.note && (
        <p className={`mt-2 text-center text-xs ${mutedText}`}>{plan.note}</p>
      )}
      {!plan.premium && (
        <p className={`mt-2 text-center text-xs ${mutedText}`}>No credit card required</p>
      )}

      <div className={`mt-6 border-t pt-6 ${plan.premium ? "border-background/15" : "border-border/60"}`}>
        <ul className="space-y-3">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} aria-hidden />
              <span className={plan.premium ? "text-background/90" : "text-foreground/80"}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StickyCta({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px w-full" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-all duration-300 ease-out lg:hidden ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">Start with a 7-day free trial</p>
            <p className="truncate text-xs text-muted-foreground">No credit card required</p>
          </div>
          <Button className="h-11 shrink-0 px-5 shadow-md shadow-primary/20" asChild>
            <a href={href}>Start trial</a>
          </Button>
        </div>
      </div>
    </>
  );
}
