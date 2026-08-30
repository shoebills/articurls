"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signup as apiSignup, ApiError, resendVerificationEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { API_URL, UGC_DOMAIN } from "@/lib/env";

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2";

type SignupStep = "email" | "profile";

function SignupForm() {
  const [step, setStep] = useState<SignupStep>("email");
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan === "pro" || plan === "lifetime") {
      localStorage.setItem("pendingPlan", plan);
    }
  }, [searchParams]);

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      await apiSignup({ name, subdomain, email, password });
      setDone(true);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErr("Email is required");
      return;
    }
    setErr(null);
    setStep("profile");
  }

  function goBack() {
    setErr(null);
    setStep("email");
  }

  if (done) {
    async function onResendVerification() {
      setInfo(null);
      setResending(true);
      try {
        const res = await resendVerificationEmail(email);
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
            <CardTitle className="text-xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-sm">
              We sent a verification link to <strong>{email}</strong>. After verifying, you can log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {info && (
              <p className="mb-4 rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-2.5 text-sm leading-relaxed text-emerald-900">
                {info}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="mb-2 w-full"
              onClick={onResendVerification}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend verification email"}
            </Button>
            <Button asChild className="w-full">
              <Link href="/login?signup=1">Go to log in</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthPageShell>
    );
  }

  // Step 1: Email
  if (step === "email") {
    return (
      <AuthPageShell>
        <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
        <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-xl font-bold tracking-tight">Create your account</CardTitle>
            <CardDescription className="text-sm">
              Start writing your ideas in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
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

            <form onSubmit={handleEmailContinue} className="space-y-4">
              <div className={FIELD_GROUP}>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@example.com"
                  autoFocus
                  required 
                />
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>

            <p className="mt-6 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </AuthPageShell>
    );
  }

  // Step 2: Profile (Name, Subdomain, Password) - Final Step
  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={goBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl font-bold tracking-tight">Complete your profile</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Choose your identity and secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className={FIELD_GROUP}>
              <Label htmlFor="name">Display name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe"
                autoFocus
                required 
              />
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                placeholder="yourname"
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, underscore, hyphen"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your public URL: {subdomain || "subdomain"}.{UGC_DOMAIN}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground/80">
                This cannot be changed later, but you can connect a custom domain anytime.
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

function SignupFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
