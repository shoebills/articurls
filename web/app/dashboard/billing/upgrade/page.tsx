"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  createCheckout,
  changePlan,
  getSubscription,
  getAccountUsage,
  ApiError,
  isProSubscription,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut } from "@/lib/types";
import { PRO_TIERS, tierPrice, CYCLE_UNIT, LIFETIME_PRICE, type BillingCycle } from "@/lib/plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  ChevronLeft,
  Flame,
  Zap,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

function UpgradePlanContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [err, setErr] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [scheduledMsg, setScheduledMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [s, u] = await Promise.all([
        getSubscription(token).catch(() => null),
        getAccountUsage(token).catch(() => null),
      ]);
      setSub(s);

      const queryTier = searchParams.get("tier");
      const queryCycle = searchParams.get("cycle");

      let tierIdx = -1;
      if (queryTier) {
        tierIdx = PRO_TIERS.findIndex((t) => t.key === queryTier);
      }
      if (tierIdx === -1 && s?.tier) {
        tierIdx = PRO_TIERS.findIndex((t) => t.key === s.tier);
      }
      if (tierIdx === -1 && u) {
        tierIdx = PRO_TIERS.findIndex((t) => t.views === u.tier_limit);
      }
      if (tierIdx !== -1) setSelectedTierIndex(tierIdx);

      if (queryCycle === "monthly" || queryCycle === "yearly") {
        setCycle(queryCycle);
      } else if (s?.billing_cycle === "monthly" || s?.billing_cycle === "yearly") {
        setCycle(s.billing_cycle);
      }
    } catch {
      setErr("Failed to load subscription info");
    } finally {
      setLoading(false);
    }
  }, [token, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpgrade() {
    if (!token) return;
    const tier = PRO_TIERS[selectedTierIndex] || PRO_TIERS[0];
    setBusyPlan(tier.key);
    setErr(null);
    setScheduledMsg(null);
    try {
      if (sub?.plan_type === "pro" && sub.status === "active") {
        const result = await changePlan(token, tier.key, cycle);
        if (result.scheduled) {
          const date = result.effective_date
            ? new Date(result.effective_date).toLocaleDateString()
            : "your next billing date";
          setScheduledMsg(`Plan change scheduled — ${tier.name} starts on ${date}.`);
        } else if (result.applied) {
          setScheduledMsg(`${tier.name} is now active.`);
        }
      } else {
        const { checkout_url } = await createCheckout(token, "pro", tier.key, cycle);
        window.location.href = checkout_url;
        return;
      }
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to change plan");
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleBuyLifetime() {
    if (!token) return;
    setBusyPlan("lifetime");
    setErr(null);
    try {
      const { checkout_url } = await createCheckout(token, "lifetime");
      window.location.href = checkout_url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to start checkout");
      setBusyPlan(null);
    }
  }

  const pro = isProSubscription(sub);
  const selectedTier = PRO_TIERS[selectedTierIndex] || PRO_TIERS[0];
  const price = tierPrice(selectedTier, cycle);
  const canChangePlan = sub?.plan_type === "pro" && sub.status === "active";
  const isPastDue = sub?.plan_type === "pro" && sub.status === "past_due";
  const isCurrentActiveTier =
    pro &&
    sub?.plan_type === "pro" &&
    sub.tier === selectedTier.key &&
    (sub.billing_cycle || "monthly") === cycle;

  return (
    <div className="mx-auto max-w-[800px] space-y-6 sm:space-y-8">
      {/* Back link & Header */}
      <div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          Back to Billing
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Select Subscription Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All platform features are included on every tier. Choose the monthly traffic volume that matches your growth.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <>
          <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-b from-card to-muted/10 shadow-sm rounded-2xl">
            <div className="absolute top-0 right-0 bg-primary/10 text-primary px-4 py-1.5 rounded-bl-xl text-xs font-semibold flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Simple, Traffic-Based Pricing
            </div>

            <CardContent className="p-6 sm:p-8 space-y-8">
              {/* Billing cycle tabs */}
              <div className="flex justify-center">
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

              {/* Views Selector Header */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Traffic Volume
                </label>
                <Select
                  value={String(selectedTierIndex)}
                  onValueChange={(val) => setSelectedTierIndex(Number(val))}
                >
                  <SelectTrigger className="w-full h-12 bg-background border-border/80 text-foreground">
                    <SelectValue placeholder="Choose monthly traffic volume" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRO_TIERS.map((tier, idx) => (
                      <SelectItem key={tier.key} value={String(idx)} className="py-2.5 cursor-pointer">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">{tier.name}</span>
                            {tier.key === "pro_100k" ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                Popular
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            ${tierPrice(tier, cycle)}
                            {CYCLE_UNIT[cycle]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Display */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 p-5 rounded-2xl bg-muted/40 border border-border/70">
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider block mb-1">
                    Plan: {selectedTier.name}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      ${price}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">
                      / {cycle === "monthly" ? "month" : "year"}
                    </span>
                    {cycle === "yearly" && (
                      <span className="text-sm text-muted-foreground line-through">
                        ${selectedTier.monthly * 12}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="lg"
                  className="h-11 px-8 text-sm font-semibold"
                  variant={isCurrentActiveTier ? "outline" : "default"}
                  disabled={isCurrentActiveTier || isPastDue || busyPlan === selectedTier.key}
                  onClick={handleUpgrade}
                >
                  {isCurrentActiveTier
                    ? "Current Active Tier"
                    : isPastDue
                      ? "Past Due — Fix Payment"
                      : busyPlan === selectedTier.key
                        ? "Working..."
                        : canChangePlan
                          ? `Switch to ${selectedTier.name} ($${price}${CYCLE_UNIT[cycle]})`
                          : `Select Plan ($${price}${CYCLE_UNIT[cycle]})`}
                </Button>
              </div>

              {isPastDue ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Your subscription is past due. Update your payment method from the customer portal to change plans.
                </p>
              ) : null}

              {scheduledMsg ? (
                <p className="text-xs text-muted-foreground">{scheduledMsg}</p>
              ) : null}

              {sub?.pending_tier && sub.pending_billing_cycle ? (
                <p className="text-xs text-muted-foreground">
                  Scheduled: switches to {sub.pending_tier.replace("pro_", "Pro ").replace("_", " ")} (
                  {sub.pending_billing_cycle}) on{" "}
                  {sub.current_period_end
                    ? new Date(sub.current_period_end).toLocaleDateString()
                    : "your next billing date"}
                  .
                </p>
              ) : null}

              {/* Included Features Grid */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Everything Included In Every Plan
                </p>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{selectedTier.viewsText}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Unlimited sites & publications</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Custom domains + Cloudflare Subfolder</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Privacy-friendly Umami Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Automated SEO Engine & RSS / Atom feeds</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>Custom CSS & HTML code injection</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifetime Deal Card */}
          <Card className="border-border/70 shadow-xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/[0.08] via-transparent to-transparent pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
                    <Flame className="h-3.5 w-3.5" />
                    One-Time Purchase
                  </div>
                  <CardTitle className="text-xl font-bold">Lifetime Deal</CardTitle>
                  <CardDescription>
                    Pay once, get 100,000 monthly pageviews and all Pro features forever.
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">${LIFETIME_PRICE}</span>
                  <span className="text-xs text-muted-foreground font-medium">/ once</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  No recurring bills, includes all future updates, custom domains, and analytics.
                </p>
                <Button
                  variant={sub?.plan_type === "lifetime" ? "outline" : "default"}
                  disabled={sub?.plan_type === "lifetime" || busyPlan === "lifetime"}
                  onClick={handleBuyLifetime}
                  className="shrink-0 font-semibold"
                >
                  {sub?.plan_type === "lifetime"
                    ? "Current Plan"
                    : busyPlan === "lifetime"
                      ? "Redirecting…"
                      : `Buy Lifetime — $${LIFETIME_PRICE}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {err ? <FloatingErrorToast message={err} onDismiss={() => setErr(null)} /> : null}
    </div>
  );
}

function UpgradePlanFallback() {
  return (
    <div className="mx-auto max-w-[800px] space-y-6 sm:space-y-8">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export default function UpgradePlanPage() {
  return (
    <Suspense fallback={<UpgradePlanFallback />}>
      <UpgradePlanContent />
    </Suspense>
  );
}