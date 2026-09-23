"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Webhook } from "lucide-react";
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

export default function NewsletterSettingsPage() {
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
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Failed to load newsletter settings"))
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
      setSuccess("Newsletter settings saved successfully.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save newsletter settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Top navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure subscription form content, placement on your publication, and external webhook delivery.
          </p>
        </div>
      </div>

      {loading || !design ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Form Content & Copy */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Form Content & Copy</h2>

            <div className="space-y-2.5">
              <Label htmlFor="newsletter_headline">Form Headline</Label>
              <Input
                id="newsletter_headline"
                className="mt-2"
                placeholder="e.g. Subscribe to our newsletter"
                maxLength={120}
                value={design.newsletter_headline || ""}
                onChange={(e) => setDesign({ ...design, newsletter_headline: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="newsletter_text">Introduction Text</Label>
              <Textarea
                id="newsletter_text"
                className="mt-2"
                placeholder="e.g. Get our latest articles and updates delivered directly to your inbox."
                rows={2}
                value={design.newsletter_text || ""}
                onChange={(e) => setDesign({ ...design, newsletter_text: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-2.5">
                <Label htmlFor="newsletter_button_text">Button Label</Label>
                <Input
                  id="newsletter_button_text"
                  className="mt-2"
                  placeholder="Subscribe"
                  maxLength={50}
                  value={design.newsletter_button_text || ""}
                  onChange={(e) => setDesign({ ...design, newsletter_button_text: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="newsletter_disclaimer">Disclaimer or Privacy Note</Label>
                <Input
                  id="newsletter_disclaimer"
                  className="mt-2"
                  placeholder="e.g. No spam, unsubscribe anytime."
                  value={design.newsletter_disclaimer || ""}
                  onChange={(e) => setDesign({ ...design, newsletter_disclaimer: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Form Placement */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Form Placement</h2>

            <div className="space-y-3 max-w-md">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Near Header</p>
                  <p className="text-xs text-muted-foreground">Renders inline below the publication header / hero</p>
                </div>
                <Switch
                  checked={design.newsletter_show_near_header === true}
                  onCheckedChange={(checked) => setDesign({ ...design, newsletter_show_near_header: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">In Footer</p>
                  <p className="text-xs text-muted-foreground">Renders a subscription box at the bottom of pages</p>
                </div>
                <Switch
                  checked={design.newsletter_show_in_footer !== false}
                  onCheckedChange={(checked) => setDesign({ ...design, newsletter_show_in_footer: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* ESP & Webhook Integration */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">ESP & Webhook Integration</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When readers subscribe, Articurls will trigger an HTTP POST request to this endpoint with the reader&apos;s email address. Connect your favorite Email Service Provider (ConvertKit, Mailchimp, Loops, Brevo) or automation platform (Zapier, Make).
            </p>

            <div className="space-y-2.5">
              <Label htmlFor="newsletter_webhook_url">Webhook Endpoint URL</Label>
              <Input
                id="newsletter_webhook_url"
                className="mt-2"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={design.newsletter_webhook_url || ""}
                onChange={(e) => setDesign({ ...design, newsletter_webhook_url: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="newsletter_webhook_token">Bearer Authorization Token (Optional)</Label>
              <Input
                id="newsletter_webhook_token"
                className="mt-2"
                type="password"
                placeholder="Secret token sent as Authorization: Bearer <token>"
                value={design.newsletter_webhook_token || ""}
                onChange={(e) => setDesign({ ...design, newsletter_webhook_token: e.target.value })}
                disabled={saving}
              />
              <p className="text-[11px] text-muted-foreground">
                Secure secret token included in request headers for endpoint verification.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-[120px]">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
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
