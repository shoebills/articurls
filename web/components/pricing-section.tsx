"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRO_TIERS, tierPrice, CYCLE_UNIT, type BillingCycle } from "@/lib/plans";
import { appAuthHref } from "@/lib/env";
import { useAuth } from "@/lib/auth-context";

export function PricingSection() {
  const { token } = useAuth();
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const signupUrl = appAuthHref("/signup");
  const billingUrl = appAuthHref("/dashboard/billing");
  const lifetimeHref = token ? `${billingUrl}?plan=lifetime` : `${signupUrl}?plan=lifetime`;

  const currentTier = PRO_TIERS[selectedTierIdx];
  const price = tierPrice(currentTier, cycle);
  const proHref = `${signupUrl}?plan=pro&tier=${currentTier.key}&cycle=${cycle}`;

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

        <div className="mt-10 flex justify-center">
          <Tabs value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="gap-1.5">
                Yearly
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  Save 17%
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="mx-auto mt-10 max-w-4xl space-y-6">
          {/* Pro — two-column: pricing info on the left, benefits on the right */}
          <div className="relative grid gap-8 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.05] to-card p-6 ring-1 ring-primary/20 shadow-xl shadow-primary/10 sm:p-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Grow audience
              </p>
              <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">{currentTier.name}</h3>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">${price}</span>
                <span className="text-base font-normal text-muted-foreground">{CYCLE_UNIT[cycle]}</span>
                {cycle === "yearly" && (
                  <span className="ml-1 text-sm line-through text-muted-foreground">
                    ${currentTier.monthly * 12}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                $0 Due today · 7-day free trial
              </p>

              <div className="mt-4 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Traffic Allowance
                </div>
                <Select
                  value={String(selectedTierIdx)}
                  onValueChange={(v) => setSelectedTierIdx(Number(v))}
                >
                  <SelectTrigger aria-label="Traffic allowance" className="w-full">
                    <SelectValue placeholder="Select traffic allowance" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRO_TIERS.map((tier, idx) => (
                      <SelectItem key={tier.key} value={String(idx)}>
                        {tier.name} — ${tierPrice(tier, cycle)}
                        {CYCLE_UNIT[cycle]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="mt-6 h-12 w-full shadow-md shadow-primary/20"
                variant="default"
                asChild
              >
                <a href={proHref}>Start for free</a>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                No credit card required
              </p>
            </div>

            <div className="border-t border-border/60 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <FeatureList
                features={[
                  currentTier.viewsText,
                  "Unlimited sites & publications",
                  "Unlimited posts, pages & authors",
                  "Custom domain & /blog subdirectory",
                  "Automatic SSL on every domain",
                  "Technical SEO & AI search (llms.txt)",
                  "JSON-LD, FAQ schema & auto 301s",
                  "Newsletter capture & webhook sync",
                  "Conversion CTAs on posts & pages",
                  "Real-time analytics & world map",
                  "GA4, Search Console & AdSense",
                  "RSS, Atom, sitemap & robots.txt",
                ]}
                checkColor="text-primary"
                textClass="text-foreground/80"
              />
            </div>
          </div>

          <div className="mx-auto max-w-sm">
            <LifetimeCard href={lifetimeHref} />
          </div>
        </div>
      </div>

      <StickyCta href={proHref} />
    </section>
  );
}

function FeatureList({
  features,
  checkColor,
  textClass,
}: {
  features: string[];
  checkColor: string;
  textClass: string;
}) {
  return (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm">
          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${checkColor}`} aria-hidden />
          <span className={textClass}>{f}</span>
        </li>
      ))}
    </ul>
  );
}

function LifetimeCard({ href }: { href: string }) {
  return (
    <div className="relative rounded-2xl border-transparent bg-foreground text-background p-6 shadow-2xl shadow-black/20 sm:p-7">
      <span className="badge-vibrate absolute right-5 top-5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black">
        10 seats left
      </span>

      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-background/60">
        Own forever
      </p>
      <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">Lifetime</h3>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight">$99</span>
        <span className="text-base font-normal text-background/60"> once</span>
        <span className="ml-1 text-sm line-through text-background/60">$149</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-background/60">
        Pay one time. Keep Pro for lifetime.
      </p>

      <Button
        className="mt-6 h-12 w-full bg-background text-foreground hover:bg-background/90"
        variant="default"
        asChild
      >
        <a href={href}>Get Lifetime</a>
      </Button>
      <p className="mt-2 text-center text-xs text-background/60">Limited time deal</p>

      <div className="mt-6 border-t border-background/15 pt-6">
        <FeatureList
          features={[
            "Unlimited monthly pageviews",
            "Everything in Pro",
            "No recurring charges, ever",
            "Future Pro features included",
            "Yours for life",
          ]}
          checkColor="text-background/70"
          textClass="text-background/90"
        />
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
            <a href={href}>Start for free</a>
          </Button>
        </div>
      </div>
    </>
  );
}