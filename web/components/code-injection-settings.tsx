"use client";

import { useEffect, useState } from "react";
import { getCodeInjection, updateCodeInjection, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Loader2 } from "lucide-react";

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
    <div className="space-y-10">
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-10">
          {/* Head Code */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Header Code Injection (<code className="font-mono text-xs text-primary">&lt;head&gt;</code>)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Injected into the HTML <code className="font-mono text-xs">&lt;head&gt;</code> tag. Ideal for Google Analytics, Fathom, Meta Pixel, or custom fonts.
              </p>
            </div>
            <Textarea
              id="head-code"
              rows={4}
              value={headCode}
              onChange={(e) => setHeadCode(e.target.value)}
              placeholder="<!-- Paste your tracking script or head tags here -->"
              className="font-mono text-xs"
            />
          </section>

          {/* Body Code */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Footer Code Injection (<code className="font-mono text-xs text-primary">Before &lt;/body&gt;</code>)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Injected right before the closing <code className="font-mono text-xs">&lt;/body&gt;</code> tag. Ideal for live chat widgets, cookie consent banners, or heatmaps.
              </p>
            </div>
            <Textarea
              id="body-code"
              rows={4}
              value={bodyCode}
              onChange={(e) => setBodyCode(e.target.value)}
              placeholder="<!-- Paste your body script or widget code here -->"
              className="font-mono text-xs"
            />
          </section>

          {/* Custom CSS */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Custom CSS Styling (<code className="font-mono text-xs text-primary">&lt;style&gt;</code>)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Custom CSS rules to override theme styles or tweak typography and spacing.
              </p>
            </div>
            <Textarea
              id="custom-css"
              rows={4}
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder="/* .prose-blog h1 { font-weight: 800; } */"
              className="font-mono text-xs"
            />
          </section>

          <div className="flex items-center justify-end pt-6 border-t border-border/60">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}
      {saved && !error && (
        <FloatingErrorToast
          message="Saved successfully"
          onDismiss={() => setSaved(false)}
          autoDismissMs={3000}
          variant="success"
        />
      )}
    </div>
  );
}
