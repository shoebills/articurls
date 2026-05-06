"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signup as apiSignup, ApiError, resendVerificationEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingErrorToast } from "@/components/floating-error-toast";

/** Label → control spacing; same for text inputs and plan picker. */
const FIELD_GROUP = "flex flex-col gap-2.5";

type SignupStep = "email" | "profile" | "plan";

function SignupForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planFromQuery = searchParams.get("plan_choice") === "pro" ? "pro" : "free";
  
  const [step, setStep] = useState<SignupStep>("email");
  const [planChoice, setPlanChoice] = useState<"free" | "pro">(planFromQuery);

  useEffect(() => {
    setPlanChoice(planFromQuery);
  }, [planFromQuery]);

  function selectPlan(p: "free" | "pro") {
    setPlanChoice(p);
    const params = new URLSearchParams(searchParams.toString());
    params.set("plan_choice", p);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

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
      await apiSignup({ name, user_name, email, password, plan_choice: planChoice });
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

  function handleProfileContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Display name is required");
      return;
    }
    if (!user_name.trim()) {
      setErr("Username is required");
      return;
    }
    if (!password || password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    setErr(null);
    setStep("plan");
  }

  function goBack() {
    setErr(null);
    if (step === "profile") setStep("email");
    if (step === "plan") setStep("profile");
  }

  if (done) {
    async function onResendVerification() {
      setInfo(null);
      setResending(true);
      try {
        const res = await resendVerificationEmail(email, planChoice);
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
            <CardTitle className="text-2xl font-bold tracking-tight">Get started</CardTitle>
            <CardDescription className="text-base">
              Enter your email to create your account
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

  // Step 2: Profile (Name, Username, Password)
  if (step === "profile") {
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
              <CardTitle className="text-2xl font-bold tracking-tight">Create your profile</CardTitle>
            </div>
            <CardDescription className="text-base">
              Choose your display name and username
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileContinue} className="space-y-5">
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
              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </AuthPageShell>
    );
  }

  // Step 3: Plan Selection
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
            <CardTitle className="text-2xl font-bold tracking-tight">Choose your plan</CardTitle>
          </div>
          <CardDescription className="text-base">
            {planFromQuery === "pro" 
              ? "Confirm Pro or switch to Free - you can change anytime"
              : "Start with Free and upgrade anytime"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className={FIELD_GROUP}>
              <div
                role="radiogroup"
                aria-label="Choose plan"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={planChoice === "free"}
                  aria-label="Free plan, $0 per month"
                  className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  onClick={() => selectPlan("free")}
                >
                  <Card
                    className={cn(
                      "relative rounded-lg border bg-card p-4 shadow-none hover:shadow-none motion-reduce:transition-none",
                      planChoice === "free"
                        ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "border-border/80 hover:border-border",
                    )}
                  >
                    {planChoice === "free" && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    <div className="flex flex-col gap-2">
                      <span className="text-lg font-semibold">Free</span>
                      <span className="text-2xl font-bold tabular-nums">
                        $0<span className="text-base font-normal text-muted-foreground">/month</span>
                      </span>
                      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Unlimited posts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Unlimited pages</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Basic analytics</span>
                        </li>
                      </ul>
                    </div>
                  </Card>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={planChoice === "pro"}
                  aria-label="Pro plan, $19 per month"
                  className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  onClick={() => selectPlan("pro")}
                >
                  <Card
                    className={cn(
                      "relative rounded-lg border bg-card p-4 shadow-none hover:shadow-none motion-reduce:transition-none",
                      planChoice === "pro"
                        ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background"
                        : "border-border/80 hover:border-border",
                    )}
                  >
                    {planChoice === "pro" && (
                      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    <div className="flex flex-col gap-2">
                      <span className="text-lg font-semibold">Pro</span>
                      <span className="text-2xl font-bold tabular-nums">
                        $19<span className="text-base font-normal text-muted-foreground">/month</span>
                      </span>
                      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Everything in Free</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Custom domain</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Email notifications</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>Remove footer</span>
                        </li>
                      </ul>
                    </div>
                  </Card>
                </button>
              </div>
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
