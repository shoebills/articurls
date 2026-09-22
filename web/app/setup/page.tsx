"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeGoogleSignup, createSite, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPageShell } from "@/components/auth-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Columns3, LayoutTemplate, Loader2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { UGC_DOMAIN } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Label → control spacing; same for text inputs. */
const FIELD_GROUP = "flex flex-col gap-2";

const TOKEN_KEY = "articurls_token";
const SITE_KEY = "articurls_site_id";

type Flow = "email" | "google";

const TEMPLATES = [
  {
    id: "standard",
    title: "Standard",
    description: "Clean, centered typography",
    tagline: "Perfect for writers, personal blogs, and essays.",
    icon: LayoutTemplate,
    wireframe: "standard",
  },
  {
    id: "saas",
    title: "SaaS & Hub",
    description: "Grid cards & category filter",
    tagline: "Built for modern companies and multi-category blogs.",
    icon: Columns3,
    wireframe: "saas",
  },
] as const;

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: (typeof TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary/20"
          : "border-border/70 hover:border-border hover:bg-muted/30"
      )}
    >
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border",
                selected
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground"
              )}
            >
              <template.icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">{template.title}</h4>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </div>
          </div>

          {selected ? (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Check className="h-3.5 w-3.5" />
              <span>Selected</span>
            </div>
          ) : null}
        </div>

        {/* Wireframe Diagram */}
        {template.wireframe === "standard" ? (
          <div className="mb-4 flex aspect-[16/9] w-full flex-col justify-between rounded-lg border border-border/80 bg-muted/20 p-3">
            <div className="space-y-1.5">
              <div className="mx-auto h-2.5 w-1/3 rounded-full bg-foreground/25" />
              <div className="mx-auto h-1.5 w-1/2 rounded-full bg-foreground/10" />
            </div>
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-background/80 p-2 shadow-2xs">
                <div className="mb-1 h-2 w-3/4 rounded-sm bg-foreground/20" />
                <div className="h-1.5 w-full rounded-sm bg-foreground/10" />
              </div>
              <div className="rounded-md border border-border/60 bg-background/80 p-2 shadow-2xs">
                <div className="mb-1 h-2 w-2/3 rounded-sm bg-foreground/20" />
                <div className="h-1.5 w-full rounded-sm bg-foreground/10" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex aspect-[16/9] w-full flex-col justify-between rounded-lg border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-10 rounded-full bg-primary/40" />
              <div className="h-2 w-8 rounded-full bg-foreground/15" />
              <div className="h-2 w-12 rounded-full bg-foreground/15" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/60 bg-background/80 p-1.5 shadow-2xs">
                <div className="mb-1 aspect-[16/10] w-full rounded-xs bg-foreground/10" />
                <div className="h-1.5 w-3/4 rounded-xs bg-foreground/20" />
              </div>
              <div className="rounded-md border border-border/60 bg-background/80 p-1.5 shadow-2xs">
                <div className="mb-1 aspect-[16/10] w-full rounded-xs bg-foreground/10" />
                <div className="h-1.5 w-3/4 rounded-xs bg-foreground/20" />
              </div>
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">{template.tagline}</p>
      </div>
    </div>
  );
}

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
  const [templateId, setTemplateId] = useState<string>("standard");
  const [name, setName] = useState(googleName);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flow: Flow = sessionId ? "google" : "email";
  const totalSteps = 3;

  useEffect(() => {
    if (googleName) setName(googleName);
  }, [googleName]);

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
      return cleanSubdomain(subdomain).length >= 3;
    }
    return true;
  }

  async function finishEmailFlow() {
    if (!storedToken) return;
    const newSite = await createSite(storedToken, {
      subdomain: cleanSubdomain(subdomain),
      nav_blog_name: blogName.trim() || undefined,
      template_id: templateId,
    });
    localStorage.setItem(SITE_KEY, String(newSite.site_id));
    const plan = localStorage.getItem("pendingPlan");
    localStorage.removeItem("pendingPlan");
    if (plan === "pro" || plan === "lifetime") {
      router.replace(`/dashboard/billing?plan=${plan}`);
    } else {
      router.replace("/dashboard");
    }
  }

  async function finishGoogleFlow() {
    if (!sessionId) return;
    const { access_token } = await completeGoogleSignup({
      session_id: sessionId,
      subdomain: cleanSubdomain(subdomain),
      name: name.trim(),
      nav_blog_name: blogName.trim() || undefined,
      template_id: templateId,
    });
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem("articurls_last_login", "google");
    const plan = localStorage.getItem("pendingPlan");
    localStorage.removeItem("pendingPlan");
    if (plan === "pro" || plan === "lifetime") {
      router.replace(`/dashboard/billing?plan=${plan}`);
    } else {
      router.replace("/dashboard");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (flow === "google") {
        await finishGoogleFlow();
      } else {
        await finishEmailFlow();
      }
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Failed to create your blog");
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    setErr(null);
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  }

  function goBack() {
    setErr(null);
    if (step > 0) {
      setStep(step - 1);
    }
  }

  if (flow === "google" && !sessionId) return null; // redirecting
  if (flow === "email" && !storedToken) return null; // redirecting

  const titles =
    flow === "google"
      ? ["About you", "Pick your subdomain", "Choose a theme"]
      : ["Name your blog", "Pick your subdomain", "Choose a theme"];

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
            {flow === "google" ? "Claim your space" : "Set up your blog in a few simple steps"}
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
          <form onSubmit={onSubmit} className="space-y-4">
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
                        placeholder="Jane Doe"
                        autoFocus
                        required
                      />
                    </div>

                    <div className={FIELD_GROUP}>
                      <Label htmlFor="blogName" className="text-sm font-medium">
                        Blog name <span className="text-xs text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="blogName"
                        value={blogName}
                        onChange={(e) => setBlogName(e.target.value)}
                        placeholder="e.g. Jane's Notes"
                      />
                      <p className="text-xs text-muted-foreground">
                        Shown in your header and page title
                      </p>
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
                      What should we call your blog?
                    </Label>
                    <Input
                      id="blogName"
                      value={blogName}
                      onChange={(e) => setBlogName(e.target.value)}
                      placeholder="e.g. Jane's Notes, Tech Dispatch, Daily Life"
                      autoFocus
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      You can change this anytime in settings
                    </p>
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
                      autoFocus
                      required
                    />
                    <span className="text-xs text-muted-foreground select-none">
                      .{UGC_DOMAIN}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This is your free Articurls URL. You can connect your own custom domain later.
                  </p>
                </div>

                {subdomain.length >= 3 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs text-primary">
                    <span className="font-medium">Preview:</span>{" "}
                    <span className="font-mono">
                      https://{cleanSubdomain(subdomain)}.{UGC_DOMAIN}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Theme Picker */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pick a layout to start with. You can change themes and fonts anytime in settings.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      selected={templateId === tpl.id}
                      onSelect={() => setTemplateId(tpl.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step < totalSteps - 1 ? (
              <Button
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
                type="submit"
                className="w-full"
                size="lg"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating your space...
                  </>
                ) : flow === "google" ? (
                  "Start publishing"
                ) : (
                  "Create my blog"
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
