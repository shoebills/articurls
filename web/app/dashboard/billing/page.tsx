"use client";

import { useCallback, useEffect, useState } from "react";
import { createCheckout, getSubscription, getTransactions, ApiError, isProSubscription } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarDays, Sparkles, Zap } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { token } = useAuth();
  const [sub, setSub] = useState<SubscriptionOut | null>(null);
  const [tx, setTx] = useState<TransactionOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const t = await getTransactions(token);
      setTx(t);
    } catch (e) {
      setTx([]);
      if (e instanceof ApiError) setErr(e.message);
    }
    const s = await getSubscription(token);
    setSub(s);
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
  const statusLower = sub?.status?.toLowerCase() ?? "";
  const statusBadgeVariant =
    statusLower === "active" ? "success" : statusLower === "trialing" || statusLower === "past_due" ? "secondary" : "outline";

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>

      <Card className="overflow-hidden border-border/70 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader
          className={cn(
            "border-b border-border/60 pb-5",
            pro ? "bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent" : "bg-muted/25"
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
              <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Current plan</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {pro
                  ? "Pro unlocks the full toolkit for your blog."
                  : "You’re on the free tier. Upgrade when you’re ready for more."}
              </CardDescription>
            </div>
            {sub ? (
              <Badge variant={statusBadgeVariant} className="w-fit shrink-0 capitalize sm:mt-0.5">
                {sub.plan_type} · {sub.status}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8">
            <div className="flex min-w-0 flex-1 gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
                  pro
                    ? "border-primary/20 bg-primary/10 text-primary shadow-primary/10"
                    : "border-border/80 bg-muted/50 text-muted-foreground"
                )}
                aria-hidden
              >
                {pro ? <Sparkles className="h-7 w-7" strokeWidth={1.75} /> : <Zap className="h-7 w-7" strokeWidth={1.75} />}
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-3xl font-bold tracking-tight">{displayTier}</p>
                {sub?.current_period_end ? (
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>
                        <span className="text-muted-foreground">Period ends </span>
                        <span className="font-medium tabular-nums text-foreground">
                          {format(new Date(sub.current_period_end), "MMMM d, yyyy")}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No billing period on file yet.</p>
                )}
              </div>
            </div>
            {!pro ? (
              <div className="flex shrink-0 flex-col justify-center gap-2 border-t border-border/60 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <Button className="h-11 min-h-11 w-full touch-manipulation lg:w-auto lg:min-w-[14rem]" onClick={upgrade} disabled={busy}>
                  {busy ? "Redirecting…" : "Upgrade to Pro — $9/mo"}
                </Button>
                <p className="text-center text-xs text-muted-foreground lg:text-left">Secure checkout via Stripe.</p>
              </div>
            ) : (
              <div className="flex shrink-0 flex-col justify-center">
                <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-center lg:w-auto">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Active</p>
                  <p className="mt-0.5 text-sm text-emerald-900/90">Thanks for being Pro</p>
                </div>
              </div>
            )}
          </div>
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
