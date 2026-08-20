"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  CalendarDays,
  Flame,
  Timer,
  Check,
  Zap,
  ArrowUpRight,
  Activity,
  Sparkles,
  Mail,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const VIEW_TIERS = [
  { id: "10k", label: "Up to 10k views", price: 9, views: 10_000 },
  { id: "50k", label: "Up to 50k views", price: 29, views: 50_000 },
  { id: "100k", label: "Up to 100k views", price: 49, views: 100_000, popular: true },
  { id: "250k", label: "Up to 250k views", price: 79, views: 250_000 },
  { id: "500k", label: "Up to 500k views", price: 99, views: 500_000 },
  { id: "1m", label: "Up to 1M views", price: 149, views: 1_000_000 },
  { id: "custom", label: "1M+ views (Custom)", price: null, views: null },
];

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [tx, setTx] = useState<TransactionOut[]>([]);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
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

      if (u) {
        const matchingIdx = VIEW_TIERS.findIndex((tier) => tier.views === u.tier_limit);
        if (matchingIdx !== -1) {
          setSelectedTierIndex(matchingIdx);
        }
      }
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

  const selectedTier = VIEW_TIERS[selectedTierIndex];
  const isCustomTier = selectedTier.id === "custom";
  const isCurrentActiveTier = usage?.tier_limit === selectedTier.views && pro;

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

          {/* Unified Pricing Card with Views Selector */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Articurls Pro Plan</h2>
              <p className="text-sm text-muted-foreground">
                All features included on every tier. Simply choose the traffic volume your publications need.
              </p>
            </div>

            <Card className="relative overflow-hidden border-2 border-primary/40 bg-gradient-to-b from-card to-muted/10 shadow-sm">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary px-4 py-1 rounded-bl-xl text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Simple, Traffic-Based Pricing
              </div>

              <CardContent className="p-6 sm:p-8 space-y-8">
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
                      {VIEW_TIERS.map((tier, idx) => (
                        <SelectItem key={tier.id} value={String(idx)} className="py-2.5 cursor-pointer">
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{tier.label}</span>
                              {tier.popular ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                  Popular
                                </span>
                              ) : null}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                              {tier.price !== null ? `$${tier.price}/mo` : "Custom"}
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
                      {isCustomTier ? "Enterprise Volume" : `Tier: ${selectedTier.label}`}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      {isCustomTier ? (
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                          Custom Pricing
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            ${selectedTier.price}
                          </span>
                          <span className="text-sm text-muted-foreground font-medium">/ month</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isCustomTier ? (
                    <Button asChild className="h-11 px-6 gap-2">
                      <Link href="/dashboard/support">
                        <Mail className="h-4 w-4" />
                        Contact Us for Enterprise
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-11 px-8 text-sm font-semibold"
                      variant={isCurrentActiveTier ? "outline" : "default"}
                      disabled={isCurrentActiveTier || busyPlan === selectedTier.id}
                      onClick={() => handleUpgrade(selectedTier.id)}
                    >
                      {isCurrentActiveTier
                        ? "Current Active Tier"
                        : busyPlan === selectedTier.id
                          ? "Redirecting..."
                          : `Upgrade to Pro ($${selectedTier.price}/mo)`}
                    </Button>
                  )}
                </div>

                {/* Included Features Grid */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Everything Included In Every Plan
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{isCustomTier ? "1,000,000+ monthly views" : `${selectedTier.views?.toLocaleString()} monthly pageviews`}</span>
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
                      <span>Editorial & SaaS modern themes</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Multi-author management & bylines</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Category discovery & badge placement</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Automated XML sitemaps & RSS/Atom</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>SEO automation & zero-config fallbacks</span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>Custom code injection (&lt;head&gt;, &lt;body&gt;, CSS)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
