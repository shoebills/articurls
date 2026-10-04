"use client";

import { useEffect, useState } from "react";
import { getCodeInjection, updateCodeInjection, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-20 w-full max-w-2xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Head Code */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Header Code Injection
              </h2>
            </div>
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="head-code">Head code</Label>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Loaded on every page. Ideal for analytics, fonts, or verification tags.
                </p>
              </div>
              <Textarea
                id="head-code"
                rows={4}
                value={headCode}
                onChange={(e) => setHeadCode(e.target.value)}
                placeholder="<!-- Google Analytics, Meta Pixel, or custom fonts -->"
                className="mt-2 font-mono text-xs"
              />
            </div>
          </section>

          {/* Body Code */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Footer Code Injection
              </h2>
            </div>
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="body-code">Footer code</Label>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Loaded at the end of every page. Ideal for chat widgets or consent banners.
                </p>
              </div>
              <Textarea
                id="body-code"
                rows={4}
                value={bodyCode}
                onChange={(e) => setBodyCode(e.target.value)}
                placeholder="<!-- Live chat, cookie banner, or heatmap scripts -->"
                className="mt-2 font-mono text-xs"
              />
            </div>
          </section>

          {/* Custom CSS */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                Custom CSS Styling
              </h2>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="custom-css">Custom CSS</Label>
              <Textarea
                id="custom-css"
                rows={4}
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder="/* Make it yours — buttons, headings, spacing */"
                className="mt-2 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground sm:text-sm">
                Custom CSS rules to override theme styles or tweak typography and spacing.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground sm:text-sm">
                <li>
                  .prose-blog h1, h2, p, a, blockquote, pre, code — style article headings, links, quotes, and code blocks.
                </li>
                <li>
                  :root {"{ --background, --primary, --muted, --border, --link }"} — recolor site-wide theme tokens.
                </li>
                <li>
                  .dark {"{ --background, --primary, ... }"} — override the same tokens for dark mode.
                </li>
                <li>
                  --button-radius, --font-heading-family — tweak button corners and heading font.
                </li>
              </ul>
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
