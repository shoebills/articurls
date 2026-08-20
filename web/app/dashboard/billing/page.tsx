"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCheckout,
  getSubscription,
  getTransactions,
  getCustomerPortalLink,
  getAccountUsage,
  ApiError,
  isProSubscription,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut, AccountUsage } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  CalendarDays,
  Flame,
  Timer,
  Check,
  Zap,
  Globe,
  ArrowUpRight,
  Activity,
  Layers,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const USAGE_TIERS = [
  { id: "starter", name: "Starter", price: 9, views: 10_000, description: "For emerging creators & niche blogs" },
  { id: "growth", name: "Growth", price: 29, views: 50_000, description: "For fast-growing publications" },
  { id: "pro", name: "Pro", price: 49, views: 100_000, description: "For established blogs & startups", popular: true },
  { id: "scale", name: "Scale", price: 79, views: 250_000, description: "For scaling content teams & agencies" },
  { id: "business", name: "Business", price: 99, views: 500_000, description: "For high-traffic multi-site networks" },
  { id: "enterprise", name: "Enterprise", price: 149, views: 1_000_000, description: "For media brands & high-volume SaaS" },
];

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [tx, setTx] = useState<TransactionOut[]>([]);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [busyPortal, setBusyPortal] = useState(false);
  const [loading, setLoading] = useState(true);

  const autoTriggered = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [t, s, u] = await Promise.all([
        getTransactions(token).catch((e) => {
          if (e instanceof ApiError) setErr(e.message);
          return [];
        }),
        getSubscription(token).catch(() => null),
        getAccountUsage(token).catch(() => null),
      ]);
      setTx(t);
      setSub(s);
      setUsage(u);
    } catch {
      setErr("Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || !token || autoTriggered.current) return;

    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (!plan) return;

    const pro = isProSubscription(sub);
    const isLifetime = sub?.plan_type === "lifetime";

    if (plan === "pro" && !pro && !isLifetime) {
      autoTriggered.current = true;
      handleUpgrade("pro");
    } else if (plan === "lifetime" && !isLifetime) {
      autoTriggered.current = true;
      handleUpgrade("lifetime");
    }
  }, [loading, token, sub]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpgrade(planId = "pro") {
    if (!token) return;
    setBusyPlan(planId);
    try {
      const { checkout_url } = await createCheckout(token, planId === "lifetime" ? "lifetime" : "monthly");
      window.location.href = checkout_url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Checkout failed");
    } finally {
      setBusyPlan(null);
    }
  }

  async function manageSubscription() {
    if (!token) return;
    setBusyPortal(true);
    try {
      const { url } = await getCustomerPortalLink(token);
      window.location.href = url;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setErr("Customer portal not available yet. Please try again later.");
      } else {
        setErr(e instanceof ApiError ? e.message : "Failed to open customer portal");
      }
    } finally {
      setBusyPortal(false);
    }
  }

  const pro = isProSubscription(sub);
  const isLifetime = sub?.plan_type === "lifetime";
  const subStatus = sub?.status?.toLowerCase() ?? "";

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing & Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, usage tiers, and payment history across all publications.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Combined Usage Meter */}
          {usage && (
            <Card className="border-border/70 shadow-xs overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg sm:text-xl font-semibold">Account Monthly Usage</CardTitle>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    30-Day Cycle
                  </span>
                </div>
                <CardDescription>
                  Aggregate pageview traffic combined across all your owned publications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl sm:text-3xl font-bold tabular-nums">
                        {usage.total_pageviews.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {" "}
                        / {usage.tier_limit.toLocaleString()} views
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {usage.usage_percentage}% used
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        usage.usage_percentage > 90
                          ? "bg-destructive"
                          : usage.usage_percentage > 75
                            ? "bg-amber-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${Math.max(2, usage.usage_percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Per-Site Breakdown */}
                {usage.sites.length > 0 && (
                  <div className="pt-3 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Breakdown by Site ({usage.sites.length})
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {usage.sites.map((site) => {
                        const sitePct =
                          usage.total_pageviews > 0
                            ? Math.round((site.pageviews / usage.total_pageviews) * 100)
                            : 0;
                        return (
                          <div
                            key={site.site_id}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {site.nav_blog_name || site.subdomain}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {site.subdomain}.articurls.site
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold tabular-nums">
                                {site.pageviews.toLocaleString()} views
                              </p>
                              <p className="text-[10px] text-muted-foreground tabular-nums">
                                {sitePct}% of total
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current Plan Status */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold">Active Plan</CardTitle>
                <CardDescription>Your current subscription tier & billing status.</CardDescription>
              </div>
              {sub && sub.plan_type !== "trial" && sub.plan_type !== "lapsed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={manageSubscription}
                  disabled={busyPortal}
                  className="gap-1.5 text-xs"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {busyPortal ? "Redirecting…" : "Manage in Stripe / Dodo"}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                {sub?.plan_type === "trial" && pro ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] px-3 py-1.5 text-xs font-medium text-blue-800">
                    <Timer className="h-3.5 w-3.5" />
                    14-Day Free Trial
                  </div>
                ) : isLifetime ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-1.5 text-xs font-medium text-amber-800">
                    <Flame className="h-3.5 w-3.5" />
                    Lifetime Plan
                  </div>
                ) : pro && sub ? (
                  subStatus === "past_due" ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.1] px-3 py-1.5 text-xs font-medium text-amber-900">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Past due
                    </div>
                  ) : subStatus === "cancelled" ? (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-1.5 text-xs font-medium text-red-800">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Cancelled
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active Pro Plan
                    </div>
                  )
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Free / Inactive
                  </div>
                )}
              </div>

              {sub?.current_period_end && pro && !isLifetime ? (
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    Billing cycle renews on{" "}
                    <strong className="font-semibold text-foreground">
                      {format(new Date(sub.current_period_end), "MMMM d, yyyy")}
                    </strong>
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Usage Tiers Grid */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Usage Tiers & Upgrades</h2>
              <p className="text-sm text-muted-foreground">
                All plans include unlimited publications, custom domains, RSS feeds, themes, and SEO automation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {USAGE_TIERS.map((tier) => {
                const isCurrent = usage?.tier_limit === tier.views && pro;
                return (
                  <div
                    key={tier.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-2xs transition-all ${
                      tier.popular
                        ? "border-primary/60 bg-primary/[0.02] shadow-sm"
                        : "border-border/70 bg-card"
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-xs">
                        Popular
                      </span>
                    )}

                    <div>
                      <h3 className="font-bold text-lg text-foreground">{tier.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{tier.description}</p>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight">${tier.price}</span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>

                      <div className="mt-6 space-y-2.5 text-xs">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>{tier.views.toLocaleString()} monthly views</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>Unlimited publications / sites</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>Custom domains + CF subfolder</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>Full CMS, SEO & RSS/Atom feeds</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="mt-6 w-full"
                      variant={isCurrent ? "outline" : tier.popular ? "default" : "secondary"}
                      disabled={isCurrent || busyPlan === tier.id}
                      onClick={() => handleUpgrade(tier.id)}
                    >
                      {isCurrent ? "Current Tier" : busyPlan === tier.id ? "Redirecting..." : `Select ${tier.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment History */}
          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {tx.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No invoices or payments yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <div className="min-w-[20rem]">
                    <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <span>Amount</span>
                      <span>Status</span>
                      <span>Date</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {tx.map((row) => (
                        <li key={row.transaction_id} className="grid grid-cols-3 gap-2 px-3 py-3 text-xs">
                          <span className="font-semibold tabular-nums">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency }).format(
                              row.amount / 100
                            )}
                          </span>
                          <span className="text-muted-foreground capitalize">{row.status}</span>
                          <span className="whitespace-nowrap text-muted-foreground">
                            {row.created_at ? format(new Date(row.created_at), "PPp") : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {err && <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />}
    </div>
  );
}
