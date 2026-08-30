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
import { UGC_DOMAIN } from "@/lib/env";

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2";

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  
  // Pre-filled from Google (fetched from backend session)
  const email = searchParams.get("email") || "";
  const googleName = searchParams.get("name") || "";

  const [name, setName] = useState(googleName);
  const [subdomain, setSubdomain] = useState("");
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
        subdomain,
        password,
        name, // Include the editable name
      });

      // Store token using the same key as password login
      localStorage.setItem("articurls_token", access_token);

      const plan = localStorage.getItem("pendingPlan");
      localStorage.removeItem("pendingPlan");

      if (plan === "pro" || plan === "lifetime") {
        router.replace(`/dashboard/billing?plan=${plan}`);
      } else {
        router.replace("/dashboard");
      }
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
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-xl font-bold tracking-tight">Claim your space</CardTitle>
          <CardDescription className="text-sm">
            Choose your unique subdomain to start publishing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className={FIELD_GROUP}>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted/50 cursor-not-allowed text-muted-foreground"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Verified with Google
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="name" className="text-sm font-medium">
                Your name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                How you'll appear to readers
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="subdomain" className="text-sm font-medium">
                Subdomain
              </Label>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                placeholder="johndoe"
                autoFocus
                required
                pattern="[a-zA-Z0-9_-]+"
                title="Letters, numbers, underscore, hyphen"
              />
              {subdomain ? (
                <p className="text-sm leading-relaxed text-foreground font-medium">
                  <span className="text-primary">{subdomain}</span>.{UGC_DOMAIN}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your blog will live at subdomain.{UGC_DOMAIN}
                </p>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                This cannot be changed later, but you can connect a custom domain anytime.
              </p>
            </div>
            <div className={FIELD_GROUP}>
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Secure your account and content
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your space...
                </>
              ) : (
                "Start publishing"
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
