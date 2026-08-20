"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  getMe,
  patchDesignSettings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, UserSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ThemePicker } from "@/components/themes/theme-picker";
import { ColorPicker } from "@/components/themes/color-picker";
import { TypographyPicker } from "@/components/themes/typography-picker";
import { NavbarPicker } from "@/components/themes/navbar-picker";
import { Loader2, Palette } from "lucide-react";
import { UGC_DOMAIN } from "@/lib/env";

export default function ThemesDashboardPage() {
  const { token, refreshUser, user: ctxUser } = useAuth();
  
  const [design, setDesign] = useState<DesignSettings>(() => {
    if (typeof window === "undefined") return {
      template_id: "editorial", site_mode: "system", color_theme: "base", custom_color: null, font_family: "sans", button_style: "rounded", navbar_alignment: "left", navbar_style: "bordered",
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: true, show_about_section: false, site_footer_enabled: true,
      featured_blogs_enabled: true, featured_blog_ids: [], content_width: "wide" as const, list_image_position: "above_title" as const, show_preview_in_lists: true, about_title: null,
    };
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
    return cached ?? {
      template_id: "editorial", site_mode: "system", color_theme: "base", custom_color: null, font_family: "sans", button_style: "rounded", navbar_alignment: "left", navbar_style: "bordered",
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: true, show_about_section: false, site_footer_enabled: true,
      featured_blogs_enabled: true, featured_blog_ids: [], content_width: "wide" as const, list_image_position: "above_title" as const, show_preview_in_lists: true, about_title: null,
    };
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
    Promise.all([getDesignSettings(token), getMe(token)])
      .then(([d, u]) => {
        setDesign(d);
      })
      .catch((e) => {
        if (e instanceof ApiError) {
          setErr(e.message);
        } else {
          setErr("Failed to load design settings.");
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
      setSuccess("Design settings saved successfully.");
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr("Failed to save design settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const previewUrl = ctxUser?.custom_domain
    ? `https://${ctxUser.custom_domain}`
    : `https://${ctxUser?.user_name}.${UGC_DOMAIN}`;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xs m-4">
      {/* Configuration Sidebar */}
      <div className="w-full lg:w-[400px] border-r border-border/80 flex flex-col bg-muted/10 shrink-0">
        <div className="p-5 border-b border-border/60 bg-background flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold tracking-tight">Design Studio</h2>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
           <ThemePicker settings={design} onChange={handleUpdate} />
           <ColorPicker settings={design} onChange={handleUpdate} />
           <TypographyPicker settings={design} onChange={handleUpdate} />
           <NavbarPicker settings={design} onChange={handleUpdate} />
        </div>
      </div>

      {/* Live Preview Frame */}
      <div className="hidden lg:flex flex-1 flex-col bg-neutral-950 p-6">
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-400">
           <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Responsive Preview
           </span>
           <a href={previewUrl} target="_blank" rel="noreferrer" className="hover:text-white underline underline-offset-4">
              {previewUrl} ↗
           </a>
        </div>
        
        <div className="flex-1 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl bg-background relative isolate">
           {/* In a real implementation we would render an iframe here mapped to a special /preview route, 
               or render the ThemeWrapper with dummy content directly. For phase 3 MVP we'll show an iframe of the live site.
               Since changes are saved instantly via the iframe messaging, or they need to be saved first to see. 
               We will instruct user to save to update iframe. */}
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-sm font-medium mb-3">Save changes to update the live preview.</p>
              <Button size="sm" onClick={handleSave} disabled={saving}>Update Preview</Button>
           </div>
           <iframe 
             src={previewUrl} 
             className="w-full h-full border-0 bg-background"
             title="Live Preview"
             sandbox="allow-same-origin allow-scripts"
           />
        </div>
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} variant="error" />
      <FloatingErrorToast message={success} onDismiss={() => setSuccess(null)} variant="success" />
    </div>
  );
}
