"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  patchDesignSettings,
} from "@/lib/api";
import type { DesignSettings, ContentLayout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function ContentSettingsPage() {
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
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Failed to load content settings"))
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
      setSuccess("Content settings saved successfully.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save content settings.");
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Content & Reading</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure reading widths, article list layouts, pagination, and table of contents.
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
          {/* Feed & Pagination */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Feed & Pagination</h2>
            <div className="space-y-6 max-w-md">
              <div className="space-y-2.5">
                <Label htmlFor="posts_per_page">Posts Per Page</Label>
                <Input
                  id="posts_per_page"
                  className="mt-2"
                  type="number"
                  min={6}
                  max={48}
                  value={design.posts_per_page ?? 12}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) {
                      setDesign({ ...design, posts_per_page: 12 });
                    } else {
                      setDesign({ ...design, posts_per_page: Math.min(48, Math.max(6, val)) });
                    }
                  }}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Number of articles displayed per page in your home and category feeds (6–48).
                </p>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="pagination_type">Pagination Style</Label>
                <Select
                  value={design.pagination_type || "prev_next"}
                  onValueChange={(val) => setDesign({ ...design, pagination_type: val as "prev_next" | "numbered" })}
                  disabled={saving}
                >
                  <SelectTrigger id="pagination_type" className="mt-2">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prev_next">Previous / Next Buttons</SelectItem>
                    <SelectItem value="numbered">Numbered Pages (1, 2, 3...)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls how visitors navigate through multiple pages of posts.
                </p>
              </div>
            </div>
          </div>

          {/* Table of Contents (TOC) */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold">Table of Contents (TOC)</h2>
              <p className="text-xs text-muted-foreground">
                Automatically extracts headings from your articles and shows a quick jump menu. Hides silently when an article has no headings.
              </p>
            </div>
            <Switch
              checked={design.toc_enabled !== false}
              onCheckedChange={(checked) => setDesign({ ...design, toc_enabled: checked })}
              disabled={saving}
            />
          </div>

          {/* Article & Feed Layout */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Article & Feed Layout</h2>
            <div className="space-y-6 max-w-md">
              <div className="space-y-2.5">
                <Label htmlFor="content_layout">Content layout</Label>
                <Select
                  value={design.content_layout || "grid"}
                  onValueChange={(val) => setDesign({ ...design, content_layout: val as ContentLayout })}
                  disabled={saving}
                >
                  <SelectTrigger id="content_layout" className="mt-2">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid (Image above)</SelectItem>
                    <SelectItem value="list">List (Image beside)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Grid shows cards with image above title, list shows image beside title.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Show Excerpt Preview in Lists</p>
                <p className="text-xs text-muted-foreground">
                  Display a short preview summary below article titles in feeds.
                </p>
              </div>
              <Switch
                checked={design.show_preview_in_lists !== false}
                onCheckedChange={(checked) => setDesign({ ...design, show_preview_in_lists: checked })}
                disabled={saving}
              />
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