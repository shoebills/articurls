"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getIntegrationsSettings,
  patchIntegrationsSettings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import type { IntegrationsSettings } from "@/lib/types";
import { Loader2 } from "lucide-react";

type FormState = {
  ga_measurement_id: string;
  adsense_publisher_id: string;
  search_console_property: string;
  search_console_verification_token: string;
};

const DEFAULT_FORM: FormState = {
  ga_measurement_id: "",
  adsense_publisher_id: "",
  search_console_property: "",
  search_console_verification_token: "",
};

function normalizeIntegrations(data: Partial<IntegrationsSettings> | null | undefined): FormState {
  const form = { ...DEFAULT_FORM };
  if (!data) return form;
  form.ga_measurement_id = data.ga_measurement_id || "";
  form.adsense_publisher_id = data.adsense_publisher_id || "";
  form.search_console_property = data.search_console_property || "";
  form.search_console_verification_token = data.search_console_verification_token || "";
  return form;
}

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium">
      <span
        className={
          configured
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
        }
      />
      <span className={configured ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
        {configured ? "Configured" : "Not configured"}
      </span>
    </span>
  );
}

export default function IntegrationsSettings() {
  const { token, refreshUser } = useAuth();
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === "undefined") return DEFAULT_FORM;
    const t = localStorage.getItem("articurls_token");
    if (!t) return DEFAULT_FORM;
    return normalizeIntegrations(getCachedApiData<IntegrationsSettings>("/user/integrations", t));
  });
  const [original, setOriginal] = useState<FormState>(form);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/integrations", t);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getIntegrationsSettings(token);
        const next = normalizeIntegrations(data);
        setForm(next);
        setOriginal(next);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load integrations");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  const patch = (partial: Partial<FormState>) => {
    setForm((s) => ({ ...s, ...partial }));
  };

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await patchIntegrationsSettings(token, {
        ga_measurement_id: form.ga_measurement_id.trim() || null,
        adsense_publisher_id: form.adsense_publisher_id.trim() || null,
        search_console_property: form.search_console_property.trim() || null,
        search_console_verification_token: form.search_console_verification_token.trim() || null,
      });
      await refreshUser();
      setOriginal(form);
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save integrations");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full mt-2" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full mt-2" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full mt-2" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>
    );
  }

  const gaConfigured = !!form.ga_measurement_id.trim();
  const gscConfigured = !!form.search_console_property.trim() && !!form.search_console_verification_token.trim();
  const adsenseConfigured = !!form.adsense_publisher_id.trim();

  return (
    <>
      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Google Analytics</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Track visitors with GA4. Find your ID under{" "}
                <a
                  href="https://support.google.com/analytics/answer/12270356"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Admin → Data streams
                </a>
                .
              </p>
            </div>
            <StatusDot configured={gaConfigured} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="ga_measurement_id">Measurement ID</Label>
            <Input
              id="ga_measurement_id"
              className="mt-2 font-mono"
              value={form.ga_measurement_id}
              onChange={(e) => patch({ ga_measurement_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              disabled={busy}
            />
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Google Search Console</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Verify site ownership so you can monitor search performance.
              </p>
            </div>
            <StatusDot configured={gscConfigured} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="search_console_property">Property</Label>
            <Input
              id="search_console_property"
              className="mt-2 font-mono"
              value={form.search_console_property}
              onChange={(e) => patch({ search_console_property: e.target.value })}
              placeholder="https://example.com/"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Use a URL-prefix property. Domain properties (sc-domain:) require DNS verification and are not supported yet.
            </p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="search_console_verification_token">Verification token</Label>
            <Input
              id="search_console_verification_token"
              className="mt-2 font-mono"
              value={form.search_console_verification_token}
              onChange={(e) => patch({ search_console_verification_token: e.target.value })}
              placeholder="Paste the token from the HTML tag method"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Copy the content value from Search Console → Ownership verification → HTML tag. After saving, click Verify in Search Console — we add the meta tag to your public pages.
            </p>
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Google AdSense</h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Monetize your site with auto ads.
              </p>
            </div>
            <StatusDot configured={adsenseConfigured} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="adsense_publisher_id">Publisher ID</Label>
            <Input
              id="adsense_publisher_id"
              className="mt-2 font-mono"
              value={form.adsense_publisher_id}
              onChange={(e) => patch({ adsense_publisher_id: e.target.value })}
              placeholder="pub-XXXXXXXXXXXXXXXX"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              Find it under AdSense → Account → Settings → Account information. Auto ads load automatically on your public pages, and /ads.txt is generated for you.
            </p>
          </div>
        </section>

        <section className="space-y-4 pt-6 border-t border-border/60">
          <p className="text-xs text-muted-foreground sm:text-sm">
            These tags are added to your public pages automatically. Don&apos;t also paste Google scripts in Code Injection — they would run twice.
          </p>
        </section>

        <div className="flex items-center justify-end pt-6 border-t border-border/60">
          <Button onClick={onSave} disabled={busy || !dirty} className="min-w-[120px]">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}