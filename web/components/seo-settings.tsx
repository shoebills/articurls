"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getSeoSettings,
  patchSeoSettings,
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
import type { SeoSettings } from "@/lib/types";
import { assetUrl } from "@/lib/env";
import { transformImageUrl } from "@/lib/image-transform";
import { Loader2 } from "lucide-react";

type FormState = {
  meta_title: string;
  meta_description: string;
  og_image_url: string;
  seo_indexing_enabled: boolean;
  seo_noindex_categories: boolean;
  seo_noindex_authors: boolean;
  seo_noindex_pages: boolean;
  seo_trailing_slash_listings: boolean;
  seo_trailing_slash_jsonld: boolean;
  seo_sitemap_enabled: boolean;
  seo_robots_mode: "auto" | "custom";
  seo_robots_custom: string | null;
  seo_llms_mode: "auto" | "custom";
  seo_llms_custom: string | null;
};

const DEFAULT_FORM: FormState = {
  meta_title: "",
  meta_description: "",
  og_image_url: "",
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

function normalizeSeoSettings(data: Partial<SeoSettings> | null | undefined): FormState {
  const form = { ...DEFAULT_FORM };
  if (!data) return form;
  form.meta_title = data.meta_title || "";
  form.meta_description = data.meta_description || "";
  form.og_image_url = data.og_image_url || "";
  form.seo_indexing_enabled = data.seo_indexing_enabled ?? true;
  form.seo_noindex_categories = data.seo_noindex_categories ?? false;
  form.seo_noindex_authors = data.seo_noindex_authors ?? false;
  form.seo_noindex_pages = data.seo_noindex_pages ?? false;
  form.seo_trailing_slash_listings = data.seo_trailing_slash_listings ?? false;
  form.seo_trailing_slash_jsonld = data.seo_trailing_slash_jsonld ?? false;
  form.seo_sitemap_enabled = data.seo_sitemap_enabled ?? true;
  form.seo_robots_mode = data.seo_robots_mode ?? "auto";
  form.seo_robots_custom = form.seo_robots_mode === "custom" ? (data.seo_robots_custom ?? null) : null;
  form.seo_llms_mode = data.seo_llms_mode ?? "auto";
  form.seo_llms_custom = form.seo_llms_mode === "custom" ? (data.seo_llms_custom ?? null) : null;
  return form;
}

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

export default function SeoSettings() {
  const { token, refreshUser } = useAuth();
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === "undefined") return DEFAULT_FORM;
    const t = localStorage.getItem("articurls_token");
    if (!t) return DEFAULT_FORM;
    return normalizeSeoSettings(getCachedApiData<SeoSettings>("/user/seo", t));
  });
  const [original, setOriginal] = useState<FormState>(form);
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
  const [ogImageBusy, setOgImageBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const meta = await getSeoSettings(token);
        const next = normalizeSeoSettings(meta);
        setForm(next);
        setOriginal(next);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load SEO settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  const patch = (partial: Partial<FormState>) => {
    setForm((s) => ({ ...s, ...partial }));
  };

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await patchSeoSettings(token, {
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        seo_indexing_enabled: form.seo_indexing_enabled,
        seo_noindex_categories: form.seo_noindex_categories,
        seo_noindex_authors: form.seo_noindex_authors,
        seo_noindex_pages: form.seo_noindex_pages,
        seo_trailing_slash_listings: form.seo_trailing_slash_listings,
        seo_trailing_slash_jsonld: form.seo_trailing_slash_jsonld,
        seo_sitemap_enabled: form.seo_sitemap_enabled,
        seo_robots_mode: form.seo_robots_mode,
        seo_robots_custom: form.seo_robots_mode === "custom" ? form.seo_robots_custom || null : null,
        seo_llms_mode: form.seo_llms_mode,
        seo_llms_custom: form.seo_llms_mode === "custom" ? form.seo_llms_custom || null : null,
      });
      await refreshUser();
      setOriginal(form);
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
      setForm((s) => ({ ...s, og_image_url }));
      setOriginal((s) => ({ ...s, og_image_url }));
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
      setForm((s) => ({ ...s, og_image_url: "" }));
      setOriginal((s) => ({ ...s, og_image_url: "" }));
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
            value={form.meta_title}
            onChange={(e) => patch({ meta_title: e.target.value })}
            placeholder="Your site title on search engines"
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="seo_meta_description">Meta description</Label>
          <Textarea
            id="seo_meta_description"
            className="mt-2"
            value={form.meta_description}
            onChange={(e) => patch({ meta_description: e.target.value })}
            placeholder="Short summary for search previews"
            rows={3}
          />
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
            {form.og_image_url ? (
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
          {form.og_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={transformImageUrl(assetUrl(form.og_image_url), { width: 600 })}
              alt=""
              className="aspect-[3/2] w-full max-w-xs rounded-lg border border-border/70 object-cover"
            />
          ) : null}
        </div>

        <div className="border-t pt-5 mt-2 space-y-6">
          <ToggleRow
            title="Indexing"
            hint="When off, the entire site is hidden from search engines."
            checked={form.seo_indexing_enabled}
            disabled={busy}
            onCheckedChange={(checked) => patch({ seo_indexing_enabled: checked })}
          />

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Noindex</h2>
            <ToggleRow
              title="Category pages"
              checked={form.seo_noindex_categories}
              disabled={busy}
              onCheckedChange={(checked) => patch({ seo_noindex_categories: checked })}
            />
            <ToggleRow
              title="Author pages"
              checked={form.seo_noindex_authors}
              disabled={busy}
              onCheckedChange={(checked) => patch({ seo_noindex_authors: checked })}
            />
            <ToggleRow
              title="Pages"
              checked={form.seo_noindex_pages}
              disabled={busy}
              onCheckedChange={(checked) => patch({ seo_noindex_pages: checked })}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Trailing slash</h2>
            <ToggleRow
              title="Listing URLs"
              hint="Adds / to category, author and homepage canonicals."
              checked={form.seo_trailing_slash_listings}
              disabled={busy}
              onCheckedChange={(checked) => patch({ seo_trailing_slash_listings: checked })}
            />
            <ToggleRow
              title="Structured data URLs"
              hint="Adds / to JSON-LD URLs."
              checked={form.seo_trailing_slash_jsonld}
              disabled={busy}
              onCheckedChange={(checked) => patch({ seo_trailing_slash_jsonld: checked })}
            />
          </div>

          <ToggleRow
            title="Sitemap"
            hint="When off, /sitemap.xml returns 404."
            checked={form.seo_sitemap_enabled}
            disabled={busy}
            onCheckedChange={(checked) => patch({ seo_sitemap_enabled: checked })}
          />

          <div className="space-y-2.5">
            <Label htmlFor="seo_robots_mode">Robots.txt</Label>
            <Select
              value={form.seo_robots_mode}
              onValueChange={(val) => patch({ seo_robots_mode: val as "auto" | "custom" })}
              disabled={busy}
            >
              <SelectTrigger id="seo_robots_mode" className="mt-2">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatically managed</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {form.seo_robots_mode === "custom" ? (
              <Textarea
                id="seo_robots_custom"
                className="mt-2 font-mono text-xs"
                rows={6}
                value={form.seo_robots_custom ?? ""}
                onChange={(e) => patch({ seo_robots_custom: e.target.value })}
                placeholder={"User-agent: *\nAllow: /"}
                disabled={busy}
              />
            ) : null}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="seo_llms_mode">LLMs.txt</Label>
            <Select
              value={form.seo_llms_mode}
              onValueChange={(val) => patch({ seo_llms_mode: val as "auto" | "custom" })}
              disabled={busy}
            >
              <SelectTrigger id="seo_llms_mode" className="mt-2">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatically managed</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {form.seo_llms_mode === "custom" ? (
              <Textarea
                id="seo_llms_custom"
                className="mt-2 font-mono text-xs"
                rows={6}
                value={form.seo_llms_custom ?? ""}
                onChange={(e) => patch({ seo_llms_custom: e.target.value })}
                placeholder={"# My site\n> Description"}
                disabled={busy}
              />
            ) : null}
          </div>

          <div className="pt-2">
            <Button onClick={onSave} disabled={busy || !dirty} className="min-w-[120px]">
              {busy ? (
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