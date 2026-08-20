"use client";

import { useEffect, useState } from "react";
import { getCodeInjection, updateCodeInjection, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Code2, Loader2, Save, Check } from "lucide-react";

export function CodeInjectionSettings() {
  const { token } = useAuth();
  const [headCode, setHeadCode] = useState("");
  const [bodyCode, setBodyCode] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getCodeInjection(token)
      .then((data) => {
        setHeadCode(data.custom_head_code || "");
        setBodyCode(data.custom_body_code || "");
        setCustomCss(data.custom_css || "");
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Failed to load code injection settings");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await updateCodeInjection(token, {
        custom_head_code: headCode.trim() || null,
        custom_body_code: bodyCode.trim() || null,
        custom_css: customCss.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save code injection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl font-semibold">Code Injection</CardTitle>
        </div>
        <CardDescription>
          Inject custom analytics scripts, tracking pixels, meta tags, and CSS into your publication.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading settings...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Head Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="head-code" className="font-semibold text-sm">
                  Header Code Injection (<code className="text-xs text-primary font-mono">&lt;head&gt;</code>)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Injected into the HTML <code className="font-mono text-xs">&lt;head&gt;</code> tag. Ideal for Google Analytics, Fathom, Meta Pixel, or custom fonts.
              </p>
              <textarea
                id="head-code"
                rows={4}
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                placeholder="<!-- Paste your tracking script or head tags here -->"
                className="w-full rounded-md border border-input bg-muted/20 p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>

            {/* Body Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body-code" className="font-semibold text-sm">
                  Footer Code Injection (<code className="text-xs text-primary font-mono">Before &lt;/body&gt;</code>)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Injected right before the closing <code className="font-mono text-xs">&lt;/body&gt;</code> tag. Ideal for live chat widgets, cookie consent banners, or heatmaps.
              </p>
              <textarea
                id="body-code"
                rows={4}
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                placeholder="<!-- Paste your body script or widget code here -->"
                className="w-full rounded-md border border-input bg-muted/20 p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-css" className="font-semibold text-sm">
                  Custom CSS Styling (<code className="text-xs text-primary font-mono">&lt;style&gt;</code>)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Custom CSS rules to override theme styles or tweak typography and spacing.
              </p>
              <textarea
                id="custom-css"
                rows={4}
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder="/* .prose-blog h1 { font-weight: 800; } */"
                className="w-full rounded-md border border-input bg-muted/20 p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <Check className="h-3.5 w-3.5" /> Saved successfully
                  </span>
                )}
              </div>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Code Changes
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}
    </Card>
  );
}
