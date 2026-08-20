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
import { NavbarPicker } from "@/components/themes/navbar-picker";
import { ExternalLink, Loader2 } from "lucide-react";
import { UGC_DOMAIN } from "@/lib/env";

export default function ThemesDashboardPage() {
  const { token, refreshUser, user } = useAuth();

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
        navbar_enabled: false,
        nav_blog_name: null,
        nav_blog_name_size: "medium",
        nav_menu_enabled: true,
        show_about_section: false,
        site_footer_enabled: true,
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
        navbar_enabled: false,
        nav_blog_name: null,
        nav_blog_name_size: "medium",
        nav_menu_enabled: true,
        show_about_section: false,
        site_footer_enabled: true,
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

  const publicSiteUrl =
    user?.custom_domain && (user.domain_status === "active" || user.domain_status === "grace")
      ? `https://${user.custom_domain}`
      : user?.user_name
        ? `https://${encodeURIComponent(user.user_name)}.${UGC_DOMAIN}`
        : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Themes & Design</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize your publication layout, typography, color scheme, and header styling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {publicSiteUrl ? (
            <Button variant="outline" asChild className="gap-1.5 text-xs sm:text-sm">
              <a href={publicSiteUrl} target="_blank" rel="noopener noreferrer">
                <span>View My Site</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
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
              <CardTitle className="text-lg font-semibold">1. Blog Template</CardTitle>
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
              <CardTitle className="text-lg font-semibold">2. Colors & Appearance</CardTitle>
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
              <CardTitle className="text-lg font-semibold">3. Typography & UI Style</CardTitle>
              <CardDescription>
                Set font family pairings and button corner styling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TypographyPicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>

          {/* Section 4: Header & Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">4. Header & Navigation</CardTitle>
              <CardDescription>
                Customize how your logo and navigation bar are arranged.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NavbarPicker settings={design} onChange={handleUpdate} />
            </CardContent>
          </Card>
        </div>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess(null)} variant="success" />
    </div>
  );
}
