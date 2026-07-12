"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeViaEmail, ApiError } from "@/lib/api";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "already" | "error";

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setErrMsg("The unsubscribe link is missing a token.");
      setState("error");
      return;
    }
    (async () => {
      try {
        const res = await unsubscribeViaEmail(token);
        setState(res.message === "Already unsubscribed" ? "already" : "success");
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
            {state === "loading" && "Unsubscribing…"}
            {state === "success" && "Unsubscribed"}
            {state === "already" && "Already unsubscribed"}
            {state === "error" && "Unsubscribe failed"}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {state === "loading" && "Please wait while we process your unsubscribe request."}
            {state === "success" && "You have been unsubscribed. You will no longer receive email updates from this blog."}
            {state === "already" && "You were already unsubscribed — no further action is needed."}
            {state === "error" && (errMsg ?? "The link may be invalid or expired.")}
          </CardDescription>
        </CardHeader>
      </Card>
    </AuthPageShell>
  );
}

function UnsubscribeFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<UnsubscribeFallback />}>
      <UnsubscribeInner />
    </Suspense>
  );
}
