"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  patchDesignSettings,
} from "@/lib/api";
import type { DesignSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

export default function CtaSettingsPage() {
  const { token, refreshUser } = useAuth();

  const [design, setDesign] = useState<DesignSettings | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/design", t);
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getDesignSettings(token)
      .then((d) => setDesign(d))
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Failed to load CTA settings"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !design) return;
    setSaving(true);
    setErr(null);
    setSuccess(null);
    try {
      const updated = await patchDesignSettings(token, design);
      setDesign(updated);
      await refreshUser();
      setSuccess("CTA settings saved successfully.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save CTA settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12 sm:space-y-8">
      <SettingsBreadcrumb current="Call to Action" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Call to Action</h1>
      </div>

      {loading || !design ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-20 w-full max-w-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Promotion Card</h2>
            </div>
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2.5">
                <Label htmlFor="cta_heading">Heading</Label>
                <Input
                  id="cta_heading"
                  className="mt-2"
                  placeholder="e.g. Enjoyed this article? Join my newsletter"
                  maxLength={120}
                  value={design.cta_heading || ""}
                  onChange={(e) => setDesign({ ...design, cta_heading: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="cta_description">Description</Label>
                <Textarea
                  id="cta_description"
                  className="mt-2"
                  placeholder="A short message explaining what readers get when they take action..."
                  rows={3}
                  value={design.cta_description || ""}
                  onChange={(e) => setDesign({ ...design, cta_description: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="cta_button_url">Button Destination URL</Label>
                <Input
                  id="cta_button_url"
                  className="mt-2"
                  placeholder="e.g. https://example.com or /pricing"
                  value={design.cta_button_url || ""}
                  onChange={(e) => setDesign({ ...design, cta_button_url: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-2.5">
                <Label htmlFor="cta_button_text">Button Text</Label>
                <Input
                  id="cta_button_text"
                  className="mt-2 max-w-1/2"
                  placeholder="e.g. Get Started"
                  maxLength={50}
                  value={design.cta_button_text || ""}
                  onChange={(e) => setDesign({ ...design, cta_button_text: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>

          </section>

          {/* Display Visibility */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Display Visibility</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Show on Blog Posts</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Appears at the bottom of published articles</p>
                </div>
                <Switch
                  checked={design.cta_show_on_posts !== false}
                  onCheckedChange={(checked) => setDesign({ ...design, cta_show_on_posts: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Show on Custom Pages</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Appears at the bottom of custom static pages</p>
                </div>
                <Switch
                  checked={design.cta_show_on_pages === true}
                  onCheckedChange={(checked) => setDesign({ ...design, cta_show_on_pages: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end pt-6 border-t border-border/60">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      {!err && (
        <FloatingErrorToast
          message={success}
          onDismiss={() => setSuccess(null)}
          autoDismissMs={3000}
          variant="success"
        />
      )}
    </div>
  );
}
