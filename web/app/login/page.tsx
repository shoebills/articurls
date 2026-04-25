"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, resendVerificationEmail } from "@/lib/api";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const { login, token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace("/dashboard");
  }, [loading, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") ? next : "/dashboard";
      await login(email, password, safeNext);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  const signup = searchParams.get("signup") === "1";
  const unverified = err?.toLowerCase().includes("not verified");

  async function onResendVerification() {
    if (!email.trim()) {
      setErr("Enter your email first, then tap resend.");
      return;
    }
    setResending(true);
    setInfo(null);
    try {
      const res = await resendVerificationEmail(email.trim(), "free");
      setInfo(res.message);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not resend verification email");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Log in</CardTitle>
          <CardDescription className="text-base">Use the email and password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {signup && (
            <p className="mb-6 rounded-xl border border-border/60 bg-muted/50 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
              Account created — check your email to verify, then sign in here.
            </p>
          )}
          {info && (
            <p className="mb-6 rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-3.5 text-sm leading-relaxed text-emerald-900">
              {info}
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot your password?
              </Link>
              {unverified && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={onResendVerification}
                  disabled={resending}
                >
                  {resending ? "Sending…" : "Resend verification"}
                </Button>
              )}
            </div>
            <Button type="submit" className="mt-1 w-full" size="lg" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-8 border-t border-border/60 pt-8 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

function LoginFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
