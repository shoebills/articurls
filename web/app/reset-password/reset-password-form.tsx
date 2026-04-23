"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError, resetPassword } from "@/lib/api";
import { AuthPageShell } from "@/components/auth-page-shell";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingErrorToast } from "@/components/floating-error-toast";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tokenMissing = token.length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tokenMissing) {
      setErr("Missing reset token. Open the reset link from your email again.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setErr(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not reset password");
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
            Enter your new password below to update your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-emerald-300/60 bg-emerald-50/50 px-4 py-3.5 text-sm leading-relaxed text-emerald-900">
                Password updated successfully. You can now sign in with your new password.
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href="/login">Go to log in</Link>
              </Button>
            </div>
          ) : tokenMissing ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-amber-300/60 bg-amber-50/60 px-4 py-3.5 text-sm leading-relaxed text-amber-900">
                This reset link is missing a token. Request a new one and try again.
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href="/forgot-password">Request new reset link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="new_password">New password</Label>
                <PasswordInput
                  id="new_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
