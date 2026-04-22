"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signup as apiSignup, ApiError, resendVerificationEmail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingErrorToast } from "@/components/floating-error-toast";

/** Label → control spacing; same for text inputs and plan picker. */
const FIELD_GROUP = "flex flex-col gap-2.5";

function SignupForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planFromQuery = searchParams.get("plan_choice") === "pro" ? "pro" : "free";
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
              We sent a verification link. After verifying, you can log in.
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

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Create account</CardTitle>
          <CardDescription className="text-base">
            Enter your details, then choose Free or Pro. You can change your mind before you submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className={FIELD_GROUP}>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="user_name">Username</Label>
              <Input
                id="user_name"
                value={user_name}
                onChange={(e) => setUserName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, underscore, hyphen"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your public URL: articurls.com/{user_name || "username"}
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className={FIELD_GROUP}>
              <Label id="plan-label">Choose plan</Label>
              <div
                role="radiogroup"
                aria-labelledby="plan-label"
                className="grid grid-cols-2 gap-2"
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
                      "relative rounded-lg border bg-card px-2 py-1.5 shadow-none hover:shadow-none motion-reduce:transition-none",
                      planChoice === "free" && "pr-7",
                      planChoice === "free"
                        ? "border-primary ring-1 ring-primary ring-offset-1 ring-offset-background"
                        : "border-border/80 hover:border-border",
                    )}
                  >
                    {planChoice === "free" && (
                      <span className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    <div className="flex flex-col gap-0 leading-none">
                      <span className="text-sm font-semibold">Free</span>
                      <span className="text-xs font-semibold tabular-nums">
                        $0<span className="font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>
                  </Card>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={planChoice === "pro"}
                  aria-label="Pro plan, $9 per month"
                  className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  onClick={() => selectPlan("pro")}
                >
                  <Card
                    className={cn(
                      "relative rounded-lg border bg-card px-2 py-1.5 shadow-none hover:shadow-none motion-reduce:transition-none",
                      planChoice === "pro" && "pr-7",
                      planChoice === "pro"
                        ? "border-primary ring-1 ring-primary ring-offset-1 ring-offset-background"
                        : "border-border/80 hover:border-border",
                    )}
                  >
                    {planChoice === "pro" && (
                      <span className="absolute right-1 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                    <div className="flex flex-col gap-0 leading-none">
                      <span className="text-sm font-semibold">Pro</span>
                      <span className="text-xs font-semibold tabular-nums">
                        $9<span className="font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>
                  </Card>
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Creating…" : "Sign up"}
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
