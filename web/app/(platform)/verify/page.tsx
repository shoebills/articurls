"use client";

import { useEffect, useState, Suspense, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail, listSites, resendVerificationEmail, ApiError } from "@/lib/api";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const TOKEN_KEY = "articurls_token";

function emailFromToken(token: string | null): string {
  if (!token) return "";
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const data = JSON.parse(atob(padded)) as { email?: unknown };
    return typeof data.email === "string" ? data.email : "";
  } catch {
    return "";
  }
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [msg, setMsg] = useState(token ? "Verifying…" : "");
  const [err, setErr] = useState<string | null>(token ? null : "Missing token");
  const [resendEmail, setResendEmail] = useState(() => emailFromToken(token));
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);

  useEffect(() => {
    setResendEmail(emailFromToken(token));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await verifyEmail(token);
        if (!res.access_token) {
          window.location.assign("/login");
          return;
        }
        localStorage.setItem(TOKEN_KEY, res.access_token);
        setMsg("Verified — redirecting…");
        try {
          const sites = await listSites(res.access_token);
          window.location.assign(sites.length > 0 ? "/dashboard" : "/setup");
        } catch {
          window.location.assign("/dashboard");
        }
      } catch (ex) {
        setErr(ex instanceof ApiError ? ex.message : "Verification failed");
        setMsg("");
      }
    })();
  }, [token]);

  async function onResend(e: FormEvent) {
    e.preventDefault();
    const email = resendEmail.trim();
    if (!email) {
      setResendErr("Enter the email address you signed up with.");
      return;
    }
    setResending(true);
    setResendErr(null);
    setResendMsg(null);
    try {
      const res = await resendVerificationEmail(email);
      setResendMsg(res.message);
    } catch (ex) {
      setResendErr(ex instanceof ApiError ? ex.message : "Could not resend verification email");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthPageShell>
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl font-bold tracking-tight">Email verification</CardTitle>
          <CardDescription className="text-sm">
            {resendMsg ? "Resend requested." : err ? "Something went wrong." : msg}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err && (
            <p className="rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-2.5 text-sm leading-relaxed text-destructive">
              {err}
            </p>
          )}
          {err && (
            <form onSubmit={onResend} className="space-y-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="resend-email">Email address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {resendMsg && (
                <p className="rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-2.5 text-sm leading-relaxed text-emerald-900">
                  {resendMsg}
                </p>
              )}
              {resendErr && (
                <p className="rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-2.5 text-sm leading-relaxed text-destructive">
                  {resendErr}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={resending}>
                {resending ? "Sending…" : "Resend verification email"}
              </Button>
            </form>
          )}
          {err && (
            <Button className="w-full" variant="outline" onClick={() => (window.location.href = "/login")}>
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
