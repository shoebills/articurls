"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Loader2 } from "lucide-react";

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
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

export function DesignSettingsPanel({
  title,
  description,
  render,
}: {
  title: string;
  description: string;
  render: (
    design: DesignSettings,
    onChange: (updates: Partial<DesignSettings>) => void
  ) => ReactNode;
}) {
  const { token, refreshUser } = useAuth();

  const [design, setDesign] = useState<DesignSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_DESIGN_SETTINGS;
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
    return cached ?? DEFAULT_DESIGN_SETTINGS;
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
          setErr("Failed to load settings.");
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
      setSuccess("Saved");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr("Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/70 shadow-xs">
      <CardHeader className="pb-4 sm:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold sm:text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            size="sm"
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          render(design, handleUpdate)
        )}
      </CardContent>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast
        message={success}
        onDismiss={() => setSuccess(null)}
        variant="success"
        autoDismissMs={3000}
      />
    </Card>
  );
}