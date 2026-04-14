"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail, createCheckout, ApiError } from "@/lib/api";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const TOKEN_KEY = "articurls_token";

function VerifyInner() {
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("Verifying…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const plan_choice = searchParams.get("plan_choice") || "free";
    if (!token) {
      setErr("Missing token");
      setMsg("");
      return;
    }
    (async () => {
      try {
        const res = await verifyEmail(token, plan_choice);
        localStorage.setItem(TOKEN_KEY, res.access_token);
        setMsg(res.message === "Already confirmed" ? "Already verified — redirecting…" : "Verified — redirecting…");
        if (res.next === "checkout") {
          try {
            const { checkout_url } = await createCheckout(res.access_token);
            window.location.href = checkout_url;
            return;
          } catch {
            window.location.assign("/dashboard/billing");
            return;
          }
        }
        window.location.assign("/dashboard");
      } catch (ex) {
        setErr(ex instanceof ApiError ? ex.message : "Verification failed");
        setMsg("");
      }
    })();
  }, [searchParams]);

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Email verification</CardTitle>
          <CardDescription className="text-base">{err ? "Something went wrong." : msg}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {err && (
            <Button className="w-full" size="lg" variant="outline" onClick={() => (window.location.href = "/login")}>
              Back to log in
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

function VerifyFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyInner />
    </Suspense>
  );
}
