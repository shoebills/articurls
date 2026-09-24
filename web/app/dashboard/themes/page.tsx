"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  patchDesignSettings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ThemePicker } from "@/components/themes/theme-picker";
import { ColorModePicker } from "@/components/themes/color-mode-picker";
import { ColorPalettePicker } from "@/components/themes/color-palette-picker";
import { TypographyPairingPicker } from "@/components/themes/typography-pairing-picker";
import { ButtonStylePicker } from "@/components/themes/button-style-picker";
import { Loader2 } from "lucide-react";

export default function ThemesDashboardPage() {
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
      .then((d) => {
        setDesign(d);
      })
      .catch((e) => {
        if (e instanceof ApiError) {
          setErr(e.message);
        } else {
          setErr("Failed to load theme settings.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpdate = (updates: Partial<DesignSettings>) => {
    setDesign((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = async () => {
    if (!token || !design) return;
    setSaving(true);
    setErr(null);
    setSuccess(null);
    try {
      const updated = await patchDesignSettings(token, design);
      setDesign(updated);
      await refreshUser();
      setSuccess("Theme settings saved successfully.");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr("Failed to save theme settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Themes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize your publication template, color palette, typography, and button styling.
        </p>
      </div>

      {loading || !design ? (
        <div className="space-y-8">
          <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
          <Skeleton className="h-32 w-full max-w-xl rounded-xl" />
          <Skeleton className="h-44 w-full max-w-xl rounded-xl" />
          <Skeleton className="h-44 w-full max-w-xl rounded-xl" />
          <Skeleton className="h-44 w-full max-w-xl rounded-xl" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Blog Template */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Blog Template</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Choose the overarching visual layout and post architecture for your blog.
              </p>
            </div>
            <div>
              <ThemePicker />
            </div>
          </section>

          {/* Color Mode */}
          <section className="space-y-4 pt-6 border-t border-border/60">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Color Mode</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Choose whether your publication defaults to light, dark, or follows the reader&apos;s system preference.
              </p>
            </div>
            <div className="max-w-md">
              <ColorModePicker settings={design} onChange={handleUpdate} />
            </div>
          </section>

          {/* Color Palette */}
          <section className="space-y-4 pt-6 border-t border-border/60">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Color Palette</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Select a curated accent palette or customize brand, surface, background, and link colors.
              </p>
            </div>
            <div>
              <ColorPalettePicker settings={design} onChange={handleUpdate} />
            </div>
          </section>

          {/* Typography */}
          <section className="space-y-4 pt-6 border-t border-border/60">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Typography</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Select curated typography pairings or customize headings, article content, and UI fonts independently.
              </p>
            </div>
            <div>
              <TypographyPairingPicker settings={design} onChange={handleUpdate} />
            </div>
          </section>

          {/* Button Style */}
          <section className="space-y-4 pt-6 border-t border-border/60">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Button Style</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Defines corner radius and style variant for buttons, badges, and interactive inputs.
              </p>
            </div>
            <div>
              <ButtonStylePicker settings={design} onChange={handleUpdate} />
            </div>
          </section>

          {/* Save Bar */}
          <div className="flex items-center justify-end pt-6 border-t border-border/60">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess(null)} variant="success" />
    </div>
  );
}
