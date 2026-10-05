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
  search_console_verification_token: string;
};

const DEFAULT_FORM: FormState = {
  ga_measurement_id: "",
  adsense_publisher_id: "",
  search_console_verification_token: "",
};

function normalizeIntegrations(data: Partial<IntegrationsSettings> | null | undefined): FormState {
  const form = { ...DEFAULT_FORM };
  if (!data) return form;
  form.ga_measurement_id = data.ga_measurement_id || "";
  form.adsense_publisher_id = data.adsense_publisher_id || "";
  form.search_console_verification_token = data.search_console_verification_token || "";
  return form;
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

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Google Analytics</h2>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="ga_measurement_id">Measurement ID</Label>
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
            <Input
              id="ga_measurement_id"
              className="mt-2"
              value={form.ga_measurement_id}
              onChange={(e) => patch({ ga_measurement_id: e.target.value })}
              placeholder="G-XXXXXXXXXX"
              disabled={busy}
            />
          </div>
        </section>

        <section className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Google Search Console</h2>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="search_console_verification_token">Verification token</Label>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Copy the token from the HTML tag verification method.
              </p>
            </div>
            <Input
              id="search_console_verification_token"
              className="mt-2"
              value={form.search_console_verification_token}
              onChange={(e) => patch({ search_console_verification_token: e.target.value })}
              placeholder="Paste the token from the HTML tag method"
              disabled={busy}
            />
          </div>
        </section>

        <section className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Google AdSense</h2>
          </div>
          <div className="space-y-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="adsense_publisher_id">Publisher ID</Label>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Find it under AdSense → Account information.
              </p>
            </div>
            <Input
              id="adsense_publisher_id"
              className="mt-2"
              value={form.adsense_publisher_id}
              onChange={(e) => patch({ adsense_publisher_id: e.target.value })}
              placeholder="pub-XXXXXXXXXXXXXXXX"
              disabled={busy}
            />
          </div>
        </section>

        <div className="flex items-center justify-end pt-6 border-t border-border/60">
          <Button onClick={onSave} disabled={busy || !dirty} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Changes
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