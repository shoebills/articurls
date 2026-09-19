"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getMe,
  getSeoSettings,
  patchSeoSettings,
  patchProMe,
  uploadFavicon,
  deleteFavicon,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import type { UserSettings, SeoSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function GeneralSettingsPage() {
  const { token, refreshUser, user: ctxUser } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/me", t);
  });
  const [collectSubscribers, setCollectSubscribers] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.subscriber_collection_enabled ?? false;
  });
  const [rssEnabled, setRssEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<SeoSettings>("/user/seo", t);
    return cached ? cached.rss_enabled !== false : false;
  });

  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [faviconDeleteOpen, setFaviconDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, seo] = await Promise.all([
        getMe(token),
        getSeoSettings(token),
      ]);
      setCollectSubscribers(u.subscriber_collection_enabled ?? false);
      setRssEnabled(seo.rss_enabled !== false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ctxUser) {
      setCollectSubscribers(ctxUser.subscriber_collection_enabled ?? false);
      setRssEnabled(ctxUser.rss_enabled ?? false);
    }
  }, [ctxUser]);

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

  async function saveRss(nextValue: boolean) {
    if (!token) return;
    const prev = rssEnabled;
    setRssEnabled(nextValue);
    setBusy(true);
    setErr(null);
    setSaved(null);
    try {
      await patchSeoSettings(token, { rss_enabled: nextValue });
      await refreshUser();
      setSaved("Saved");
    } catch (e) {
      setRssEnabled(prev);
      setErr(e instanceof ApiError ? e.message : "Failed to update RSS setting");
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
          Site identity, favicon, subscriber collection and RSS feed.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
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

          <div className="rounded-xl border border-border/80 bg-background p-4 sm:p-5 space-y-1">
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
              Show the subscribe button in your blog menu and below blog posts.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between gap-4 sm:gap-6">
              <p className="text-sm font-medium">RSS feed</p>
              <Switch
                checked={rssEnabled}
                onCheckedChange={(v) => {
                  setRssEnabled(v);
                  void saveRss(v);
                }}
                disabled={busy}
              />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              When enabled, RSS icon appears in the blog footer.
            </p>
          </div>
        </div>
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
