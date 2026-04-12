"use client";

import { useCallback, useEffect, useState } from "react";
import { createCheckout, getSubscription, getTransactions, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubscriptionOut, TransactionOut } from "@/lib/types";
import { isProSubscription } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Billing</h1>
      {err && <p className="text-sm text-destructive">{err}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
          <CardDescription>Synced from your Articurls subscription record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{pro ? "Pro" : "Free"}</span>
            {sub && (
              <Badge variant="secondary">
                {sub.plan_type} · {sub.status}
              </Badge>
            )}
          </div>
          {sub?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              Current period ends {format(new Date(sub.current_period_end), "PPP")}
            </p>
          )}
          {!pro && (
            <Button onClick={upgrade} disabled={busy}>
              {busy ? "Redirecting…" : "Upgrade to Pro — $9/mo"}
            </Button>
          )}
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
            <ul className="divide-y divide-border">
              {tx.map((row) => (
                <li key={row.transaction_id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span>
                    {(row.amount / 100).toFixed(2)} {row.currency}
                  </span>
                  <span className="text-muted-foreground">{row.status}</span>
                  <span className="text-muted-foreground">
                    {row.created_at ? format(new Date(row.created_at), "PPp") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
