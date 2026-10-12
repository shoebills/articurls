"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSubscription,
  getTransactions,
  getCustomerPortalLink,
  getAccountUsage,
  createCheckout,
  cancelSubscription,
  ApiError,
  isProSubscription,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UGC_DOMAIN } from "@/lib/env";
import type { SubscriptionOut, TransactionOut, AccountUsage } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  CalendarDays,
  Flame,
  Timer,
  ArrowUpRight,
  Activity,
  Zap,
  Globe,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function BillingPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [tx, setTx] = useState<TransactionOut[]>([]);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [busyPortal, setBusyPortal] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  const buyLifetime = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (!plan) return;
    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);
    if (plan === "pro") {
      router.replace("/dashboard/billing/upgrade");
    } else if (plan === "lifetime") {
      buyLifetime();
    }
  }, [router, buyLifetime]);

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

  async function handleCancelSubscription() {
    if (!token) return;
    setCancelling(true);
    setErr(null);
    try {
      const updated = await cancelSubscription(token);
      setSub(updated);
      setCancelDialogOpen(false);
      setCancelSuccessMsg(
        "Subscription cancelled. You will retain Pro access until the end of your current billing period."
      );
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
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
          {/* Active Plan Card */}
          <Card className="border-border/70 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold">Active Plan</CardTitle>
                <CardDescription>Your current subscription tier & billing status.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="gap-1.5 text-xs font-semibold">
                  <Link href="/dashboard/billing/upgrade">
                    <Zap className="h-3.5 w-3.5" />
                    Change Plan
                  </Link>
                </Button>
                {sub?.plan_type === "pro" && ["active", "past_due"].includes(sub.status) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCancelDialogOpen(true)}
                    className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    Cancel Subscription
                  </Button>
                ) : null}
                {sub && sub.plan_type !== "trial" && sub.plan_type !== "lapsed" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={manageSubscription}
                    disabled={busyPortal}
                    className="gap-1.5 text-xs text-muted-foreground"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {busyPortal ? "Redirecting…" : "Manage Invoices"}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                {sub?.plan_type === "trial" && pro ? (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] px-3 py-1.5 text-xs font-medium text-blue-800">
                    <Timer className="h-3.5 w-3.5" />
                    7-Day Free Trial
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
                      Active Pro Plan ({usage ? (usage.tier_limit !== null ? `${usage.tier_limit.toLocaleString()} views` : "Unlimited views") : sub.plan_type})
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

          {/* Lifetime one-time purchase */}
          {!isLifetime && (
            <Card className="border-amber-500/25 bg-amber-500/[0.04]">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg sm:text-xl font-semibold">Go Lifetime</CardTitle>
                </div>
                <CardDescription>
                  Pay once — $99. Keep Pro features and 100k monthly views forever, no recurring billing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={buyLifetime}
                  disabled={busyPlan === "lifetime"}
                  className="gap-1.5 text-sm font-semibold"
                >
                  {busyPlan === "lifetime" ? "Redirecting…" : "Buy Lifetime — $99"}
                </Button>
              </CardContent>
            </Card>
          )}

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
                        {usage.tier_limit !== null
                          ? `/ ${usage.tier_limit.toLocaleString()} views`
                          : "views (Unlimited traffic)"}
                      </span>
                    </div>
                    {usage.tier_limit !== null ? (
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {usage.usage_percentage ?? 0}% used
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700">
                        No Quota Limit
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {usage.tier_limit !== null && usage.usage_percentage !== null ? (
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
                  ) : null}
                </div>

                {/* Per-Site Breakdown */}
                <div className="space-y-3 pt-3 border-t border-border/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Site Traffic Breakdown ({usage.sites.length})
                  </span>

                  {usage.sites.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                      No site traffic recorded yet in this cycle.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {usage.sites.map((site) => {
                        const sitePct =
                          usage.total_pageviews > 0
                            ? Math.round((site.pageviews / usage.total_pageviews) * 100)
                            : 0;
                        return (
                          <div
                            key={site.site_id}
                            className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/15 p-3.5 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="font-semibold text-xs text-foreground truncate">
                                  {site.site_name || site.subdomain}
                                </span>
                              </div>
                              <span className="text-xs font-bold tabular-nums text-foreground shrink-0">
                                {site.pageviews.toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="truncate max-w-[130px]">{site.subdomain}.{UGC_DOMAIN}</span>
                              <span className="tabular-nums font-medium">{sitePct}% of total</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                          <span className="text-muted-foreground capitalize">{row.status.replace(/_/g, " ")}</span>
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

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Cancel Pro Subscription?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs sm:text-sm">
              <span>
                Are you sure you want to cancel? You will keep full access to custom domains, analytics, and all Pro features until{" "}
                <strong className="text-foreground">
                  {sub?.current_period_end ? format(new Date(sub.current_period_end), "MMMM d, yyyy") : "the end of your current period"}
                </strong>.
              </span>
              <span className="block text-muted-foreground">
                After this date, your subscription will not renew and your card will not be charged again.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cancelSuccessMsg && (
        <FloatingErrorToast
          message={cancelSuccessMsg}
          onDismiss={() => setCancelSuccessMsg(null)}
          variant="success"
          autoDismissMs={6000}
        />
      )}

      {err && <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />}
    </div>
  );
}
