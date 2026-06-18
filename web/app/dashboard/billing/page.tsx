"use client";

import { useCallback, useEffect, useState } from "react";
import { createCheckout, getSubscription, getTransactions, ApiError, isProSubscription, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(() => {
    return getCachedApiData<SubscriptionOut>("/billing/subscription", token);
  });
  const [tx, setTx] = useState<TransactionOut[]>(() => {
    return getCachedApiData<TransactionOut[]>("/billing/transactions", token) ?? [];
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (!token) return true;
    return !(
      apiCacheHas("/billing/transactions", token) &&
      apiCacheHas("/billing/subscription", token)
    );
  });

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [t, s] = await Promise.all([
        getTransactions(token).catch(e => {
          if (e instanceof ApiError) setErr(e.message);
          return [];
        }), 
        getSubscription(token).catch(() => null)
      ]);
      setTx(t);
      setSub(s);
    } catch (e) {
      setErr("Failed to load billing info");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function upgrade() {
    if (!token) return;
    setBusy(true);
    try {
      const { checkout_url } = await createCheckout(token);
      window.location.href = checkout_url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const pro = isProSubscription(sub);
  const displayTier = pro ? "Pro" : "Free";
  const subStatus = sub?.status?.toLowerCase() ?? "";

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-8">
        <Skeleton className="h-9 w-24" />
        <Card className="overflow-hidden border-border/70">
          <CardHeader className="space-y-1 pb-2">
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-11 w-full sm:w-56" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>

      <Card className="overflow-hidden border-border/70 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {pro && sub ? (
              subStatus === "past_due" ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.1] px-3 py-2 text-sm font-medium text-amber-900">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/30" aria-hidden />
                  Past due
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2 text-sm font-medium text-emerald-800">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25" aria-hidden />
                  Pro plan
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50 ring-2 ring-muted-foreground/20" aria-hidden />
                Free plan
              </div>
            )}
          </div>
          {sub?.current_period_end ? (
            <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="text-muted-foreground">Plan ends </span>
                <span className="font-medium tabular-nums text-foreground">
                  {format(new Date(sub.current_period_end), "MMMM d, yyyy")}
                </span>
              </span>
            </div>
          ) : null}
          {!pro ? (
            <Button className="h-11 min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-[14rem]" onClick={upgrade} disabled={busy}>
              {busy ? "Redirecting…" : "Upgrade to Pro — $9/mo"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {tx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border [-webkit-overflow-scrolling:touch]">
              <div className="min-w-[20rem]">
                <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Date</span>
                </div>
                <ul className="divide-y divide-border">
                  {tx.map((row) => (
                    <li key={row.transaction_id} className="grid grid-cols-3 gap-2 px-3 py-3 text-sm">
                      <span className="tabular-nums">
                        {(row.amount / 100).toFixed(2)} {row.currency}
                      </span>
                      <span className="text-muted-foreground">{row.status}</span>
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
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
