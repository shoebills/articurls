"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { confirmSubscription, ApiError } from "@/lib/api";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "already" | "error";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setErrMsg("The confirmation link is missing a token.");
      setState("error");
      return;
    }
    (async () => {
      try {
        const res = await confirmSubscription(token);
        setState(res.message === "Already confirmed" ? "already" : "success");
      } catch (ex) {
        setErrMsg(ex instanceof ApiError ? ex.message : "Something went wrong. The link may have expired.");
        setState("error");
      }
    })();
  }, [searchParams]);

  return (
    <AuthPageShell>
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-3">
          {state === "loading" && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {(state === "success" || state === "already") && (
            <div className="flex justify-center py-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          )}
          {state === "error" && (
            <div className="flex justify-center py-2">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
          )}
          <CardTitle className="text-center text-2xl font-bold tracking-tight">
            {state === "loading" && "Confirming…"}
            {state === "success" && "You're subscribed!"}
            {state === "already" && "Already confirmed"}
            {state === "error" && "Confirmation failed"}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {state === "loading" && "Please wait while we confirm your subscription."}
            {state === "success" && "Your subscription has been confirmed. You'll receive new posts by email."}
            {state === "already" && "Your subscription was already confirmed — you're all set."}
            {state === "error" && (errMsg ?? "The link may be invalid or expired.")}
          </CardDescription>
        </CardHeader>
        {state === "error" && (
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        )}
      </Card>
    </AuthPageShell>
  );
}

function ConfirmFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function ConfirmSubscriptionPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <ConfirmInner />
    </Suspense>
  );
}
