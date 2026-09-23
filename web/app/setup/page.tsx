"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkSubdomainAvailability, completeGoogleSignup, createSite, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { UGC_DOMAIN } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2";

const TOKEN_KEY = "articurls_token";
const SITE_KEY = "articurls_site_id";

type Flow = "email" | "google";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || null;

  // Pre-filled from Google (passed through the URL from the OAuth callback)
  const email = searchParams.get("email") || "";
  const googleName = searchParams.get("name") || "";

  const [storedToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  );
  const [blogName, setBlogName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [subdomainReason, setSubdomainReason] = useState<string | null>(null);
  const [name, setName] = useState(googleName);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flow: Flow = sessionId ? "google" : "email";
  const totalSteps = 2;

  useEffect(() => {
    if (googleName) setName(googleName);
  }, [googleName]);

  // Debounced subdomain availability check
  useEffect(() => {
    const cleaned = cleanSubdomain(subdomain);
    if (cleaned.length < 3) {
      setSubdomainStatus("idle");
      setSubdomainReason(null);
      return;
    }

    setSubdomainStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await checkSubdomainAvailability(cleaned);
        if (res.available) {
          setSubdomainStatus("available");
          setSubdomainReason(null);
        } else {
          setSubdomainStatus("unavailable");
          setSubdomainReason(res.reason || "Not available");
        }
      } catch {
        setSubdomainStatus("idle");
        setSubdomainReason(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [subdomain]);

  // Route guards: google flow needs a session, email flow needs a token
  useEffect(() => {
    if (flow === "google" && !sessionId) {
      router.replace("/login?error=invalid_session");
      return;
    }
    if (flow === "email" && !storedToken) {
      router.replace("/login");
    }
  }, [flow, sessionId, storedToken, router]);

  function cleanSubdomain(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
  }

  function canContinue(): boolean {
    if (step === 0) {
      return flow === "google" ? name.trim().length > 0 : blogName.trim().length > 0;
    }
    if (step === 1) {
      return cleanSubdomain(subdomain).length >= 3 && subdomainStatus === "available";
    }
    return true;
  }

  async function finishEmailFlow() {
    if (!storedToken) return;
    const newSite = await createSite(storedToken, {
      subdomain: cleanSubdomain(subdomain),
      site_name: blogName.trim() || undefined,
      template_id: "saas",
    });
    localStorage.setItem(SITE_KEY, String(newSite.site_id));
    const plan = localStorage.getItem("pendingPlan");
    localStorage.removeItem("pendingPlan");
    const targetUrl = (plan === "pro" || plan === "lifetime")
      ? `/dashboard/billing?plan=${plan}`
      : "/dashboard";
    window.location.assign(targetUrl);
  }

  async function finishGoogleFlow() {
    if (!sessionId) return;
    const { access_token } = await completeGoogleSignup({
      session_id: sessionId,
      subdomain: cleanSubdomain(subdomain),
      name: name.trim(),
      site_name: blogName.trim() || undefined,
      template_id: "saas",
    });
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem("articurls_last_login", "google");
    const plan = localStorage.getItem("pendingPlan");
    localStorage.removeItem("pendingPlan");
    const targetUrl = (plan === "pro" || plan === "lifetime")
      ? `/dashboard/billing?plan=${plan}`
      : "/dashboard";
    window.location.assign(targetUrl);
  }

  async function handleFinalSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (busy) return;

    setErr(null);
    setBusy(true);
    try {
      if (flow === "google") {
        await finishGoogleFlow();
      } else {
        await finishEmailFlow();
      }
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Failed to create your site");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    setErr(null);
    if (step < totalSteps - 1) {
      setStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  }

  function goBack() {
    setErr(null);
    if (step > 0) {
      setStep((prev) => Math.max(prev - 1, 0));
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (!canContinue()) return;
      if (step === totalSteps - 1) {
        handleFinalSubmit();
      } else {
        goNext();
      }
    }
  };

  if (flow === "google" && !sessionId) return null; // redirecting
  if (flow === "email" && !storedToken) return null; // redirecting

  const titles =
    flow === "google"
      ? ["About you", "Pick your subdomain"]
      : ["Create new site", "Pick your subdomain"];

  return (
    <AuthPageShell>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Card className="border-border/70 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03]">
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            {step > 0 ? (
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
            ) : null}
            <CardTitle className="text-xl font-bold tracking-tight">{titles[step]}</CardTitle>
          </div>
          <CardDescription className="text-sm">
            {flow === "google" ? "Claim your space" : "Set up your publication"}
          </CardDescription>
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 pt-2" aria-label={`Step ${step + 1} of ${totalSteps}`}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === totalSteps - 1) {
                handleFinalSubmit(e);
              }
            }}
            className="space-y-4"
          >
            {/* Step 0: Name */}
            {step === 0 && (
              <div className="space-y-4">
                {flow === "google" ? (
                  <>
                    <div className={FIELD_GROUP}>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Your name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Jane Doe"
                        autoFocus
                        required
                      />
                    </div>

                    <div className={FIELD_GROUP}>
                      <Label htmlFor="blogName" className="text-sm font-medium">
                        Site name <span className="text-xs text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="blogName"
                        value={blogName}
                        onChange={(e) => setBlogName(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="e.g. Jane's Notes"
                      />
                    </div>

                    {email && (
                      <p className="text-xs text-muted-foreground">
                        Signed in as <span className="font-medium text-foreground">{email}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <div className={FIELD_GROUP}>
                    <Label htmlFor="blogName" className="text-sm font-medium">
                      Site name
                    </Label>
                    <Input
                      id="blogName"
                      value={blogName}
                      onChange={(e) => setBlogName(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="e.g. Jane's Notes"
                      autoFocus
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Subdomain */}
            {step === 1 && (
              <div className="space-y-4">
                <div className={FIELD_GROUP}>
                  <Label htmlFor="subdomain" className="text-sm font-medium">
                    Pick your subdomain
                  </Label>
                  <div className="flex items-center rounded-md border border-input bg-muted/30 px-3">
                    <input
                      id="subdomain"
                      className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                      placeholder="my-blog"
                      value={subdomain}
                      onChange={(e) => setSubdomain(cleanSubdomain(e.target.value))}
                      onKeyDown={handleInputKeyDown}
                      autoFocus
                      required
                    />
                    <span className="text-xs text-muted-foreground select-none">
                      .{UGC_DOMAIN}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This cannot be changed later, but you can connect a custom domain anytime.
                  </p>
                </div>

                {subdomainStatus === "checking" && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking availability...
                  </p>
                )}
                {subdomainStatus === "available" && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Available
                  </p>
                )}
                {subdomainStatus === "unavailable" && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <X className="h-3.5 w-3.5" />
                    {subdomainReason || "Not available"}
                  </p>
                )}
              </div>
            )}

            {step < totalSteps - 1 ? (
              <Button
                key="btn-continue"
                type="button"
                className="w-full"
                size="lg"
                onClick={goNext}
                disabled={!canContinue()}
              >
                Continue
              </Button>
            ) : (
              <Button
                key="btn-submit"
                type="submit"
                className="w-full"
                size="lg"
                disabled={busy || !canContinue()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your space...
                  </>
                ) : flow === "google" ? (
                  "Start publishing"
                ) : (
                  "Create site"
                )}
              </Button>
            )}
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}

function SetupFallback() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-40" aria-hidden />
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupForm />
    </Suspense>
  );
}
