"use client";

import { useCallback, useEffect, useState } from "react";
import { createCheckout, getSubscription, getTransactions, ApiError, isProSubscription } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

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

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>

      <Card className="overflow-hidden border-border/70 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-1 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
          <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Current plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <p className="text-3xl font-bold tracking-tight">{displayTier}</p>
          {sub?.current_period_end ? (
            <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground/90">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="text-muted-foreground">Period ends </span>
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
