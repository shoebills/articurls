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
import { ApiError, resendVerificationEmail, exchangeOAuthCode } from "@/lib/api";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/env";

const FIELD_GROUP = "flex flex-col gap-2";

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

  // Handle OAuth errors from URL
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "Google login failed. Please try again.",
        invalid_request: "Invalid request. Please try again.",
        invalid_state: "Security validation failed. Please try again.",
        email_not_verified: "Your Google email is not verified.",
        different_google_account: "This email is already linked to a different Google account.",
        google_account_already_linked: "This Google account is already linked to another email.",
        invalid_session: "Your session has expired. Please try again.",
      };
      setErr(errorMessages[error] || "An error occurred. Please try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    const oauthCode = searchParams.get("code");
    if (oauthCode) {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      exchangeOAuthCode(oauthCode).then(() => {
        const plan = localStorage.getItem("pendingPlan");
        localStorage.removeItem("pendingPlan");
        if (plan === "pro" || plan === "lifetime") {
          router.replace(`/dashboard/billing?plan=${plan}`);
        } else {
          router.replace("/dashboard");
        }
      }).catch(() => {
        router.replace("/login?error=oauth_failed");
      });
    }
  }, [searchParams, router]);

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
      const res = await resendVerificationEmail(email.trim());
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
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl font-bold tracking-tight">Log in</CardTitle>
          <CardDescription className="text-sm">Use the email and password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {signup && (
              <p className="mb-4 rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Account created — check your email to verify, then sign in here.
            </p>
          )}
          {info && (
              <p className="mb-4 rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
              {info}
            </p>
          )}
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = `${API_URL}/auth/google/login`;
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className={FIELD_GROUP}>
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
            <div className={FIELD_GROUP}>
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
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
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
