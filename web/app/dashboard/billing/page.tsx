"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createCheckout, getSubscription, getTransactions, getCustomerPortalLink, ApiError, isProSubscription, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CalendarDays, Check, Flame } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<SubscriptionOut>("/billing/subscription", t) : null;
  });
  const [tx, setTx] = useState<TransactionOut[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? (getCachedApiData<TransactionOut[]>("/billing/transactions", t) ?? []) : [];
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLifetime, setBusyLifetime] = useState(false);
  const [busyPortal, setBusyPortal] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/billing/transactions", t);
  });

  const autoTriggered = useRef(false);

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
      upgrade();
    } else if (plan === "lifetime" && !isLifetime) {
      autoTriggered.current = true;
      upgradeLifetime();
    }
  }, [loading, token, sub]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function upgradeLifetime() {
    if (!token) return;
    setBusyLifetime(true);
    try {
      const { checkout_url } = await createCheckout(token, "lifetime");
      window.location.href = checkout_url;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Checkout failed");
    } finally {
      setBusyLifetime(false);
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

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>
        <Card className="overflow-hidden border-border/70">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Current plan</CardTitle>
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
            <CardTitle>Transactions</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Current plan</CardTitle>
          {sub && sub.plan_type !== "free" ? (
            <Button size="sm" className="h-10 rounded-md" onClick={manageSubscription} disabled={busyPortal}>
              {busyPortal ? "Redirecting…" : "Manage subscription"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {isLifetime ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-sm font-medium text-amber-800">
                <Flame className="h-4 w-4 shrink-0" aria-hidden />
                Lifetime plan
              </div>
            ) : pro && sub ? (
              subStatus === "past_due" ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.1] px-3 py-2 text-sm font-medium text-amber-900">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/30" aria-hidden />
                  Past due
                </div>
              ) : subStatus === "cancelled" ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm font-medium text-red-800">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/25" aria-hidden />
                  Cancelled
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
          {sub?.current_period_end && pro && !isLifetime ? (
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
        </CardContent>
      </Card>

      {!pro && !isLifetime ? (
        <div className="mx-auto max-w-[880px] space-y-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Choose a plan</h2>
          <div className="grid items-start gap-5 md:grid-cols-2">
          {/* Pro — highlighted */}
          <div className="relative flex flex-col rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.05] to-card p-6 shadow-xl shadow-primary/10 ring-1 ring-primary/20 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Grow audience</p>
            <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">Pro</h3>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">$9</span>
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Reach readers on your own domain.
            </p>
            <Button
              className="mt-6 h-12 w-full touch-manipulation bg-background text-foreground hover:bg-background/90"
              onClick={upgrade}
              disabled={busy}
            >
              {busy ? "Redirecting…" : "Start Pro — $9/mo"}
            </Button>
            <div className="mt-6 border-t border-border/60 pt-6">
              <ul className="space-y-3">
                {[
                  "Custom domain & automatic SSL",
                  "Collect email subscribers",
                  "Publish emails to subscribers",
                  "Views & subscribers analytics",
                  "RSS, sitemap & robots.txt",
                  "Remove Articurls branding",
                  "Custom favicon",
                  "Unlimited media storage",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="text-foreground/80">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Lifetime — exclusive dark card */}
          <div className="relative flex flex-col rounded-2xl border border-transparent bg-foreground p-6 text-background shadow-2xl shadow-black/20 sm:p-7">
            <span className="badge-vibrate absolute right-5 top-5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-black">
              10 seats left
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-background/60">Own forever</p>
            <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">Lifetime</h3>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">$99</span>
              <span className="text-base font-normal text-background/60"> once</span>
              <span className="ml-1 text-sm text-background/60 line-through">$149</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-background/60">
              Pay one time. Keep Pro for lifetime.
            </p>
            <Button
              className="mt-6 h-12 w-full touch-manipulation shadow-md shadow-primary/20"
              onClick={upgradeLifetime}
              disabled={busyLifetime}
            >
              {busyLifetime ? "Redirecting…" : "Get Lifetime — $99 once"}
            </Button>
            <p className="mt-2 text-center text-xs text-background/60">Limited time deal</p>
            <div className="mt-6 border-t border-background/15 pt-6">
              <ul className="space-y-3">
                {[
                  "Everything in Pro",
                  "No recurring charges, ever",
                  "Future Pro features included",
                  "Yours for life",
                ].map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-background/70" aria-hidden />
                    <span className="text-background/90">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </div>
        </div>
      ) : null}

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
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency }).format(row.amount / 100)}
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
