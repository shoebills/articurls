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
import { ColorPicker } from "@/components/themes/color-picker";
import { TypographyPicker } from "@/components/themes/typography-picker";
import { NavBuilder } from "@/components/themes/nav-builder";
import { FooterBuilder } from "@/components/themes/footer-builder";
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
      setSuccess("Theme and navigation settings saved successfully.");
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
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Themes & Navigation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize your publication layout, typography, navigation links, and modular footer architecture.
          </p>
        </div>
        <div>
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

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Section 1: Template */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Blog Template</CardTitle>
              <CardDescription>
                Choose the overarching visual layout and post architecture for your blog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemePicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Section 2: Colors & Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Colors & Appearance</CardTitle>
              <CardDescription>
                Configure the light/dark site mode and brand accent color personality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColorPicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Section 3: Typography & UI Shape */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Typography & UI Style</CardTitle>
              <CardDescription>
                Set font family pairings and button corner styling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TypographyPicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Section 4: Header & Dynamic Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Header & Navigation</CardTitle>
              <CardDescription>
                Configure brand name, alignment, header styling, custom links, and CTA buttons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NavBuilder settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Section 5: Modular Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Modular Footer</CardTitle>
              <CardDescription>
                Build multi-column link groups, toggle newsletter subscription, and configure copyright notices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FooterBuilder settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>
        </div>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess(null)} variant="success" />
    </div>
  );
}
