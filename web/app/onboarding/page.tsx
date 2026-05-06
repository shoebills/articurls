"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeGoogleSignup, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2.5";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  // Pre-filled from Google (fetched from backend session)
  const email = searchParams.get("email") || "";
  const googleName = searchParams.get("name") || "";

  const [name, setName] = useState(googleName);
  const [user_name, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Update name when googleName changes
  useEffect(() => {
    if (googleName) {
      setName(googleName);
    }
  }, [googleName]);

  // Redirect if no session_id
  useEffect(() => {
    if (!sessionId) {
      router.replace("/login?error=invalid_session");
    }
  }, [sessionId, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!sessionId) {
      setErr("Invalid session. Please try again.");
      return;
    }

    setErr(null);
    setBusy(true);
    
    try {
      const { access_token } = await completeGoogleSignup({
        session_id: sessionId,
        user_name,
        password,
        name, // Include the editable name
      });

      // Store token
      localStorage.setItem("access_token", access_token);
      
      // Redirect to dashboard
      router.replace("/dashboard");
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionId) {
    return null; // Will redirect via useEffect
  }

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Complete your profile</CardTitle>
          <CardDescription className="text-base">
            Choose your username and secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className={FIELD_GROUP}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                From your Google account
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
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
                autoFocus
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
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

function OnboardingFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingForm />
    </Suspense>
  );
}
