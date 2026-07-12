"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubscription } from "@/lib/api";
import { Loader2 } from "lucide-react";

function SuccessContent() {
  const [checking, setChecking] = useState(() => {
    if (typeof window === "undefined") return true;
    return !!localStorage.getItem("articurls_token");
  });
  const [activated, setActivated] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("articurls_token") : null;
    if (!token) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;
      try {
        const sub = await getSubscription(token!);
        if (sub && ["active", "past_due"].includes(sub.status)) {
          setActivated(true);
          setChecking(false);
          return;
        }
      } catch {
        // 404 or network error — keep polling
      }

      if (cancelled) return;
      attemptsRef.current += 1;
      if (attemptsRef.current < 15) {
        timer = setTimeout(poll, 2000);
      } else {
        setChecking(false);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] py-12">
      <Card>
        <CardHeader>
          <CardTitle>Payment received</CardTitle>
          <CardDescription>
            {activated
              ? "Your plan is now active. You can return to billing."
              : checking
                ? "Activating your plan… this may take a few seconds."
                : "Your payment is being processed. Access will activate shortly."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking && !activated ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking status…
            </div>
          ) : (
            <Button asChild>
              <Link href="/dashboard/billing">Back to billing</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-[1100px] py-12">
        <Card>
          <CardHeader>
            <CardTitle>Payment received</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
