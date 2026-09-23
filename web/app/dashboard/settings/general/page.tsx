"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getMe,
  getDesignSettings,
  patchDesignSettings,
  patchProMe,
  uploadFavicon,
  deleteFavicon,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import type { UserSettings, DesignSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Globe,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const LANGUAGES = [
  { code: "en", name: "English (en)" },
  { code: "es", name: "Spanish (es)" },
  { code: "fr", name: "French (fr)" },
  { code: "de", name: "German (de)" },
  { code: "it", name: "Italian (it)" },
  { code: "pt", name: "Portuguese (pt)" },
  { code: "nl", name: "Dutch (nl)" },
  { code: "ja", name: "Japanese (ja)" },
  { code: "zh", name: "Chinese (zh)" },
  { code: "ko", name: "Korean (ko)" },
  { code: "ru", name: "Russian (ru)" },
  { code: "ar", name: "Arabic (ar)" },
  { code: "hi", name: "Hindi (hi)" },
];

export default function GeneralSettingsPage() {
  const { token, refreshUser, user: ctxUser, refreshSites } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/me", t);
  });

  // Identity & Hero fields
  const [siteName, setSiteName] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [siteLanguage, setSiteLanguage] = useState("en");
  const [ogLocale, setOgLocale] = useState("");
  const [rssEnabled, setRssEnabled] = useState(false);
  const [atomEnabled, setAtomEnabled] = useState(false);

  const [collectSubscribers, setCollectSubscribers] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.subscriber_collection_enabled ?? false;
  });

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [faviconDeleteOpen, setFaviconDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, d] = await Promise.all([
        getMe(token),
        getDesignSettings(token),
      ]);
      setCollectSubscribers(u.subscriber_collection_enabled ?? false);
      setSiteName(d.site_name || u.site_name || "");
      setHeroTitle(d.hero_title || "");
      setHeroDescription(d.hero_description || "");
      setSiteLanguage(d.site_language || "en");
      setOgLocale(d.og_locale || "");
      setRssEnabled(d.rss_enabled ?? false);
      setAtomEnabled(d.atom_enabled ?? false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSaved(null);
    try {
      await patchDesignSettings(token, {
        site_name: siteName.trim() || null,
        hero_title: heroTitle.trim() || null,
        hero_description: heroDescription.trim() || null,
        site_language: siteLanguage || "en",
        og_locale: ogLocale.trim() || null,
        rss_enabled: rssEnabled,
        atom_enabled: atomEnabled,
      } as DesignSettings);
      await Promise.all([refreshUser(), refreshSites()]);
      setSaved("General settings saved successfully");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePro(collect?: boolean) {
    if (!token) return;
    const nextCollect = collect ?? collectSubscribers;
    setBusy(true);
    setErr(null);
    setSaved(null);
    const prevCollect = collectSubscribers;
    try {
      await patchProMe(token, {
        subscriber_collection_enabled: nextCollect,
      });
      await refreshUser();
      setSaved("Saved");
    } catch (e) {
      setCollectSubscribers(prevCollect);
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeFavicon() {
    if (!token) return;
    setFaviconBusy(true);
    setErr(null);
    try {
      await deleteFavicon(token);
      await refreshUser();
      setFaviconDeleteOpen(false);
      setSaved("Favicon removed");
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not remove favicon");
    } finally {
      setFaviconBusy(false);
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">General</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Site identity, hero section, language, feeds and favicon.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <form onSubmit={handleSaveGeneral} className="space-y-6 sm:space-y-8">
          {/* Site Identity Card */}
          <div className="rounded-xl border border-border/80 bg-background p-5 space-y-4">
            <h2 className="text-base font-semibold">Site Identity</h2>
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                placeholder="My Blog"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                The public name of your site shown in navigation, footer, and titles.
              </p>
            </div>
          </div>

          {/* Favicon Card */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Blog favicon</p>
              <p className="text-sm text-muted-foreground">
                Ideal 512×512px, max 256KB.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                {ctxUser?.favicon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(ctxUser.favicon_url)}
                    alt="Favicon"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <Globe className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/svg+xml"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !token) return;
                  if (file.size > 256 * 1024) {
                    setErr("Favicon too large (max 256KB)");
                    e.target.value = "";
                    return;
                  }
                  setFaviconBusy(true);
                  setErr(null);
                  try {
                    await uploadFavicon(token, file);
                    await refreshUser();
                    setSaved("Favicon uploaded");
                  } catch (ex) {
                    setErr(ex instanceof ApiError ? ex.message : "Favicon upload failed");
                  } finally {
                    setFaviconBusy(false);
                    e.target.value = "";
                  }
                }}
                disabled={faviconBusy}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={faviconBusy}
                  onClick={() => faviconInputRef.current?.click()}
                  title={ctxUser?.favicon_url ? "Change favicon" : "Upload favicon"}
                >
                  {faviconBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
                {ctxUser?.favicon_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={faviconBusy}
                    onClick={() => setFaviconDeleteOpen(true)}
                    title="Remove favicon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Hero Section Card */}
          <div className="rounded-xl border border-border/80 bg-background p-5 space-y-4">
            <div>
              <h2 className="text-base font-semibold">Hero Section</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displayed at the top of your blog. If both fields are left empty, no hero section will be rendered.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_title">Hero Title</Label>
                <Input
                  id="hero_title"
                  placeholder="e.g. Ideas, thoughts, and technical essays."
                  maxLength={120}
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_description">Hero Description</Label>
                <Textarea
                  id="hero_description"
                  placeholder="A short introduction or tagline about your publication..."
                  rows={3}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {/* Language & Locale Card */}
          <div className="rounded-xl border border-border/80 bg-background p-5 space-y-4">
            <h2 className="text-base font-semibold">Language & Region</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site_language">Site Language (HTML lang)</Label>
                <Select
                  value={siteLanguage}
                  onValueChange={setSiteLanguage}
                  disabled={busy}
                >
                  <SelectTrigger id="site_language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sets the primary &lt;html lang=&quot;...&quot;&gt; attribute.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_locale">OpenGraph Locale</Label>
                <Input
                  id="og_locale"
                  placeholder="e.g. en_US"
                  maxLength={10}
                  value={ogLocale}
                  onChange={(e) => setOgLocale(e.target.value)}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Optional locale tag for social previews (e.g. en_US, es_ES).
                </p>
              </div>
            </div>
          </div>

          {/* Feeds Card */}
          <div className="rounded-xl border border-border/80 bg-background p-5 space-y-4">
            <h2 className="text-base font-semibold">Content Feeds</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">RSS Feed</p>
                  <p className="text-xs text-muted-foreground">
                    Enables the /rss.xml feed for podcast and blog readers.
                  </p>
                </div>
                <Switch
                  checked={rssEnabled}
                  onCheckedChange={setRssEnabled}
                  disabled={busy}
                />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Atom Feed</p>
                  <p className="text-xs text-muted-foreground">
                    Enables the /atom.xml feed format.
                  </p>
                </div>
                <Switch
                  checked={atomEnabled}
                  onCheckedChange={setAtomEnabled}
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {/* Collect subscribers toggle */}
          <div className="rounded-xl border border-border/80 bg-background p-5 space-y-1">
            <div className="flex items-center justify-between gap-4 sm:gap-6">
              <p className="text-sm font-medium">Collect subscribers</p>
              <Switch
                checked={collectSubscribers}
                onCheckedChange={(v) => {
                  setCollectSubscribers(v);
                  void savePro(v);
                }}
                disabled={busy}
              />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Master switch for newsletter subscription forms across your site.
            </p>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={busy} className="min-w-[120px]">
              {busy ? (
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
      {!err && <FloatingErrorToast message={saved} onDismiss={() => setSaved(null)} autoDismissMs={3000} variant="success" />}

      <Dialog open={faviconDeleteOpen} onOpenChange={setFaviconDeleteOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Remove favicon?</DialogTitle>
            <DialogDescription>Your favicon will be removed and the default icon will be shown instead.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaviconDeleteOpen(false)} disabled={faviconBusy}>Cancel</Button>
            <Button variant="destructive" onClick={removeFavicon} disabled={faviconBusy}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
