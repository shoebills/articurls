"use client";

import { useState, Suspense } from "react";
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

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2.5";

type SignupStep = "email" | "profile";

function SignupForm() {
  const [step, setStep] = useState<SignupStep>("email");

  const [name, setName] = useState("");
  const [user_name, setUserName] = useState("");
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
      await apiSignup({ name, user_name, email, password });
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
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a verification link to <strong>{email}</strong>. After verifying, you can log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {info && (
              <p className="mb-4 rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
                {info}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="mb-3 w-full"
              size="lg"
              onClick={onResendVerification}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend verification email"}
            </Button>
            <Button asChild className="w-full" size="lg">
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
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">Create your account</CardTitle>
            <CardDescription className="text-base">
              Start publishing your ideas in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailContinue} className="space-y-5">
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
              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
            <p className="mt-8 border-t border-border/60 pt-8 text-center text-sm text-muted-foreground">
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

  // Step 2: Profile (Name, Username, Password) - Final Step
  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
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
            <CardTitle className="text-2xl font-bold tracking-tight">Complete your profile</CardTitle>
          </div>
          <CardDescription className="text-base">
            Choose your identity and secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
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
              <Label htmlFor="user_name">Username</Label>
              <Input
                id="user_name"
                value={user_name}
                onChange={(e) => setUserName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                placeholder="johndoe"
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, underscore, hyphen"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your public URL: articurls.com/{user_name || "username"}
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
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
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
