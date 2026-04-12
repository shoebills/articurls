"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signup as apiSignup, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const planChoice = searchParams.get("plan_choice") === "pro" ? "pro" : "free";

  const [name, setName] = useState("");
  const [user_name, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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
    return (
      <AuthPageShell>
        <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent a verification link. After verifying, you can log in.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Create account</CardTitle>
          <CardDescription className="text-base">
            Plan:{" "}
            <span className="font-medium text-foreground">
              {planChoice === "pro" ? "Pro ($9/mo after checkout)" : "Free"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="user_name">Username</Label>
              <Input
                id="user_name"
                value={user_name}
                onChange={(e) => setUserName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, underscore, hyphen"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your public URL: articurls.com/{user_name || "username"}
              </p>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2.5">
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
            {err && <p className="text-sm leading-relaxed text-destructive">{err}</p>}
            <Button type="submit" className="mt-1 w-full" size="lg" disabled={busy}>
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
