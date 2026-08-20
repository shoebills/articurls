"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
  ArrowUpRight,
  Activity,
  Zap,
} from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [tx, setTx] = useState<TransactionOut[]>([]);
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyPortal, setBusyPortal] = useState(false);
  const [loading, setLoading] = useState(true);

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
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Subscription cancellation is currently unavailable"
                  className="gap-1.5 text-xs text-muted-foreground cursor-not-allowed opacity-60"
                >
                  Cancel Subscription
                </Button>
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
                      Active Pro Plan ({usage ? `${usage.tier_limit.toLocaleString()} views` : sub.plan_type})
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
