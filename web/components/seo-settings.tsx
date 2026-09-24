"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getSeoSettings,
  getSeoAdvancedSettings,
  patchSeoSettings,
  patchSeoAdvancedSettings,
  uploadOgImage,
  deleteOgImage,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import type { SeoSettings, SeoAdvancedSettings } from "@/lib/types";
import { assetUrl } from "@/lib/env";
import { getSitePublicUrl } from "@/lib/public-url";
import { transformImageUrl } from "@/lib/image-transform";
import { Loader2 } from "lucide-react";

export default function SeoSettings() {
  const { token, refreshUser, activeSite } = useAuth();
  const [metaTitle, setMetaTitle] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached?.meta_title || "";
  });
  const [metaDescription, setMetaDescription] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached?.meta_description || "";
  });
  const [originalMetaTitle, setOriginalMetaTitle] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached?.meta_title || "";
  });
  const [originalMetaDescription, setOriginalMetaDescription] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached?.meta_description || "";
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/seo", t);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);
  const [ogImageUrl, setOgImageUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached?.og_image_url || "";
  });
  const [ogImageBusy, setOgImageBusy] = useState(false);
  const sitemapResourceUrl = getSitePublicUrl(activeSite, "/sitemap.xml") ?? undefined;
  const robotsResourceUrl = getSitePublicUrl(activeSite, "/robots.txt") ?? undefined;
  const llmsResourceUrl = getSitePublicUrl(activeSite, "/llms.txt") ?? undefined;
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const meta = await getSeoSettings(token);
        setMetaTitle(meta.meta_title || "");
        setMetaDescription(meta.meta_description || "");
        setOgImageUrl(meta.og_image_url || "");
        setOriginalMetaTitle(meta.meta_title || "");
        setOriginalMetaDescription(meta.meta_description || "");
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load SEO settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await patchSeoSettings(token, {
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      });
      await refreshUser();
      setOriginalMetaTitle(metaTitle);
      setOriginalMetaDescription(metaDescription);
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save SEO settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadOgImage(file: File) {
    if (!token) return;
    setOgImageBusy(true);
    setErr(null);
    try {
      const { og_image_url } = await uploadOgImage(token, file);
      setOgImageUrl(og_image_url);
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "OG image upload failed");
    } finally {
      setOgImageBusy(false);
    }
  }

  async function handleRemoveOgImage() {
    if (!token) return;
    setOgImageBusy(true);
    setErr(null);
    try {
      await deleteOgImage(token);
      setOgImageUrl("");
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to remove OG image");
    } finally {
      setOgImageBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full mt-2" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full mt-2" />
        </div>
        <Skeleton className="h-10 w-20" />
        <div className="border-t pt-5 mt-2 space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-9 w-16" />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2.5">
          <Label htmlFor="seo_meta_title">Meta title</Label>
          <Input
            id="seo_meta_title"
            className="mt-2"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Your site title on search engines"
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="seo_meta_description">Meta description</Label>
          <Textarea
            id="seo_meta_description"
            className="mt-2"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Short summary for search previews"
            rows={3}
          />
        </div>
        <div className="pt-4">
          <Button
            onClick={onSave}
            disabled={busy || (metaTitle === originalMetaTitle && metaDescription === originalMetaDescription)}
          >
            Save
          </Button>
        </div>
        <div className="border-t pt-5 mt-2 space-y-4">
          <div>
            <p className="text-sm font-medium">Open Graph image</p>
            <p className="text-xs text-muted-foreground mt-0.5">Default image for social previews when no post-specific image is set. Recommended 1200×630px.</p>
          </div>
          <input
            ref={ogInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUploadOgImage(f);
              e.currentTarget.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              onClick={() => ogInputRef.current?.click()}
              disabled={ogImageBusy}
            >
              {ogImageBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
            {ogImageUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemoveOgImage}
                disabled={ogImageBusy}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {ogImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={transformImageUrl(assetUrl(ogImageUrl), { width: 600 })}
              alt=""
              className="aspect-[3/2] w-full max-w-xs rounded-lg border border-border/70 object-cover"
            />
          ) : null}
        </div>
        <div className="border-t pt-5 mt-2 space-y-3">
          <SeoResourceRow
            label="Sitemap"
            url={sitemapResourceUrl ?? "#"}
            displayText="/sitemap.xml"
            enabled={!!sitemapResourceUrl}
          />
          <SeoResourceRow
            label="Robots.txt"
            url={robotsResourceUrl ?? "#"}
            displayText="/robots.txt"
            enabled={!!robotsResourceUrl}
          />
          <SeoResourceRow
            label="LLMs.txt"
            url={llmsResourceUrl ?? "#"}
            displayText="/llms.txt"
            enabled={!!llmsResourceUrl}
          />
        </div>
        <SeoAdvancedBlock />
      </div>
      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}

function SeoResourceRow({
  label,
  url,
  enabled,
  unavailableText = "Unavailable until custom domain is active or in grace period.",
  displayText,
}: {
  label: string;
  url?: string;
  enabled: boolean;
  unavailableText?: string;
  displayText?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {enabled && url ? (displayText || url) : unavailableText}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-h-0"
        disabled={!enabled || !url}
        onClick={() => {
          if (enabled && url) {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      >
        View
      </Button>
    </div>
  );
}

const DEFAULT_ADVANCED: SeoAdvancedSettings = {
  seo_indexing_enabled: true,
  seo_noindex_categories: false,
  seo_noindex_authors: false,
  seo_noindex_pages: false,
  seo_trailing_slash_listings: false,
  seo_trailing_slash_jsonld: false,
  seo_sitemap_enabled: true,
  seo_robots_mode: "auto",
  seo_robots_custom: null,
  seo_llms_mode: "auto",
  seo_llms_custom: null,
};

function ToggleRow({
  title,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function SeoAdvancedBlock() {
  const { token, refreshUser } = useAuth();
  const [settings, setSettings] = useState<SeoAdvancedSettings>(DEFAULT_ADVANCED);
  const [original, setOriginal] = useState<SeoAdvancedSettings>(DEFAULT_ADVANCED);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await getSeoAdvancedSettings(token);
        const merged = { ...DEFAULT_ADVANCED, ...data };
        setSettings(merged);
        setOriginal(merged);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load SEO settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(original);

  const patch = (partial: Partial<SeoAdvancedSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  };

  async function onSave() {
    if (!token) return;
    setSaving(true);
    setErr(null);
    try {
      await patchSeoAdvancedSettings(token, {
        seo_indexing_enabled: settings.seo_indexing_enabled,
        seo_noindex_categories: settings.seo_noindex_categories,
        seo_noindex_authors: settings.seo_noindex_authors,
        seo_noindex_pages: settings.seo_noindex_pages,
        seo_trailing_slash_listings: settings.seo_trailing_slash_listings,
        seo_trailing_slash_jsonld: settings.seo_trailing_slash_jsonld,
        seo_sitemap_enabled: settings.seo_sitemap_enabled,
        seo_robots_mode: settings.seo_robots_mode,
        seo_robots_custom: settings.seo_robots_mode === "custom" ? settings.seo_robots_custom || null : null,
        seo_llms_mode: settings.seo_llms_mode,
        seo_llms_custom: settings.seo_llms_mode === "custom" ? settings.seo_llms_custom || null : null,
      });
      await refreshUser();
      setOriginal(settings);
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save SEO settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="border-t pt-5 mt-2 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="border-t pt-5 mt-2 space-y-6">
        <div className="space-y-4">
          <ToggleRow
            title="Indexing"
            hint="When off, the entire site is hidden from search engines."
            checked={settings.seo_indexing_enabled}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_indexing_enabled: checked })}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Noindex</h2>
          <ToggleRow
            title="Category pages"
            checked={settings.seo_noindex_categories}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_noindex_categories: checked })}
          />
          <ToggleRow
            title="Author pages"
            checked={settings.seo_noindex_authors}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_noindex_authors: checked })}
          />
          <ToggleRow
            title="Pages"
            checked={settings.seo_noindex_pages}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_noindex_pages: checked })}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Trailing slash</h2>
          <ToggleRow
            title="Listing URLs"
            hint="Adds / to category, author and homepage canonicals."
            checked={settings.seo_trailing_slash_listings}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_trailing_slash_listings: checked })}
          />
          <ToggleRow
            title="Structured data URLs"
            hint="Adds / to JSON-LD URLs."
            checked={settings.seo_trailing_slash_jsonld}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_trailing_slash_jsonld: checked })}
          />
        </div>

        <div className="space-y-4">
          <ToggleRow
            title="Sitemap"
            hint="When off, /sitemap.xml returns 404."
            checked={settings.seo_sitemap_enabled}
            disabled={saving}
            onCheckedChange={(checked) => patch({ seo_sitemap_enabled: checked })}
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="seo_robots_mode">Robots.txt</Label>
          <Select
            value={settings.seo_robots_mode}
            onValueChange={(val) => patch({ seo_robots_mode: val as "auto" | "custom" })}
            disabled={saving}
          >
            <SelectTrigger id="seo_robots_mode" className="mt-2">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatically managed</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {settings.seo_robots_mode === "custom" ? (
            <Textarea
              id="seo_robots_custom"
              className="mt-2 font-mono text-xs"
              rows={6}
              value={settings.seo_robots_custom ?? ""}
              onChange={(e) => patch({ seo_robots_custom: e.target.value })}
              placeholder={"User-agent: *\nAllow: /"}
              disabled={saving}
            />
          ) : null}
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="seo_llms_mode">LLMs.txt</Label>
          <Select
            value={settings.seo_llms_mode}
            onValueChange={(val) => patch({ seo_llms_mode: val as "auto" | "custom" })}
            disabled={saving}
          >
            <SelectTrigger id="seo_llms_mode" className="mt-2">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatically managed</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {settings.seo_llms_mode === "custom" ? (
            <Textarea
              id="seo_llms_custom"
              className="mt-2 font-mono text-xs"
              rows={6}
              value={settings.seo_llms_custom ?? ""}
              onChange={(e) => patch({ seo_llms_custom: e.target.value })}
              placeholder={"# My site\n> Description"}
              disabled={saving}
            />
          ) : null}
        </div>

        <div className="pt-2">
          <Button onClick={onSave} disabled={saving || !dirty} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
