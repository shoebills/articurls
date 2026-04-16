"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, ApiError } from "@/lib/api";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Reset password</CardTitle>
          <CardDescription className="text-base">
            Enter your account email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, you&apos;ll receive an
                email with a reset link shortly.
              </p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Back to login
              </Button>
            </div>
          ) : (
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
              <Button type="submit" className="mt-1 w-full" size="lg" disabled={busy}>
                {busy ? "Sending link…" : "Send reset link"}
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Remembered your password?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

