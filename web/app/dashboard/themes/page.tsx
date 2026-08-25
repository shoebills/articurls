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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const [design, setDesign] = useState<DesignSettings>(() => {
    if (typeof window === "undefined") {
      return {
        template_id: "editorial",
        site_mode: "system",
        color_theme: "base",
        custom_color: null,
        font_family: "sans",
        button_style: "rounded",
        navbar_alignment: "left",
        navbar_style: "bordered",
        navbar_enabled: true,
        nav_blog_name: null,
        nav_blog_name_size: "medium",
        nav_menu_enabled: true,
        nav_items: [],
        show_about_section: false,
        site_footer_enabled: true,
        footer_columns: [],
        footer_copyright: null,
        footer_socials_enabled: true,
        footer_newsletter_enabled: true,
        footer_system_links_enabled: true,
        featured_blogs_enabled: true,
        featured_blog_ids: [],
        content_width: "wide",
        list_image_position: "above_title",
        show_preview_in_lists: true,
        about_title: null,
      };
    }
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
    return (
      cached ?? {
        template_id: "editorial",
        site_mode: "system",
        color_theme: "base",
        custom_color: null,
        font_family: "sans",
        button_style: "rounded",
        navbar_alignment: "left",
        navbar_style: "bordered",
        navbar_enabled: true,
        nav_blog_name: null,
        nav_blog_name_size: "medium",
        nav_menu_enabled: true,
        nav_items: [],
        show_about_section: false,
        site_footer_enabled: true,
        footer_columns: [],
        footer_copyright: null,
        footer_socials_enabled: true,
        footer_newsletter_enabled: true,
        footer_system_links_enabled: true,
        featured_blogs_enabled: true,
        featured_blog_ids: [],
        content_width: "wide",
        list_image_position: "above_title",
        show_preview_in_lists: true,
        about_title: null,
      }
    );
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
    setDesign((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!token) return;
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
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Themes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize your publication template, colors, and typography.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full max-w-2xl rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Blog Template — templates side by side */}
          <div>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Blog Template</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Choose the overarching visual layout and post architecture for your blog.
            </p>
            <div className="mt-4">
              <ThemePicker settings={design} onChange={handleUpdate} />
            </div>
          </div>

          {/* Color Mode */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight sm:text-lg">Color Mode</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Choose whether your publication defaults to light, dark, or follows the reader&apos;s system preference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColorModePicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight sm:text-lg">Color Palette</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Select an accent color palette for buttons, links, and highlights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColorPalettePicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Typography Pairing */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight sm:text-lg">Typography Pairing</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Curated font families engineered for reading comfort and aesthetic balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TypographyPairingPicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Button Style */}
          <Card className="rounded-2xl border-border/70 bg-card shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight sm:text-lg">Button Style</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Defines the border radius for buttons, badges, and interactive inputs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ButtonStylePicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end border-t border-border/60 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </Button>
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess(null)} variant="success" />
    </div>
  );
}
