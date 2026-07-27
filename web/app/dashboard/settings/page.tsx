"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCustomDomain,
  getMe,
  getMetaSettings,
  patchMe,
  patchMetaSettings,
  patchProMe,
  uploadFavicon,
  deleteFavicon,
  checkUsernameAvailability,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import type { CustomDomain, MetaSettings, UserSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Copy, Globe, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl, UGC_DOMAIN } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import CustomDomainSettings from "@/components/custom-domain-settings";
import SeoSettings from "@/components/seo-settings";

const USERNAME_CHANGE_COOLDOWN_DAYS = 7;

export default function SettingsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [user_name, setUserName] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.user_name ?? "";
  });
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/user/me", t)
    );
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
    const cached = getCachedApiData<MetaSettings>("/user/meta", t);
    return cached ? cached.rss_enabled !== false : false;
  });
  const [domain, setDomain] = useState<CustomDomain | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<CustomDomain>("/settings/domain", t) : null;
  });
  const [lastUsernameChangeAt, setLastUsernameChangeAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    if (!t) return null;
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.last_username_change_at || null;
  });
  const [editingUsername, setEditingUsername] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<{
    state: "idle" | "checking" | "available" | "taken" | "invalid";
    message: string;
  }  >({ state: "idle", message: "" });
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [faviconDeleteOpen, setFaviconDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, meta, domainData] = await Promise.all([
        getMe(token),
        getMetaSettings(token),
        getCustomDomain(token),
      ]);
      setUserName(u.user_name);
      setCollectSubscribers(u.subscriber_collection_enabled ?? false);
      setLastUsernameChangeAt(u.last_username_change_at || null);
      setRssEnabled(meta.rss_enabled !== false);
      setDomain(domainData);
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
      setUserName(ctxUser.user_name);
      setCollectSubscribers(ctxUser.subscriber_collection_enabled ?? false);
      setLastUsernameChangeAt(ctxUser.last_username_change_at || null);
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
      await patchMetaSettings(token, { rss_enabled: nextValue });
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

  const cooldownEnd = lastUsernameChangeAt
    ? new Date(lastUsernameChangeAt).getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 86400000
    : 0;
  const cooldownRemainingMs = Math.max(0, cooldownEnd - Date.now());
  const cooldownRemainingDays = Math.ceil(cooldownRemainingMs / 86400000);
  const canChange = cooldownRemainingMs <= 0;
  const normalizedPending = (pendingUsername || user_name || "").trim().toLowerCase();
  const liveProfileUrl = `https://${encodeURIComponent(normalizedPending)}.${UGC_DOMAIN}/`;
  const rssResourceUrl = domain?.hostname
    ? `https://${domain.hostname}/rss.xml`
    : user_name
      ? `https://${encodeURIComponent(user_name)}.${UGC_DOMAIN}/rss.xml`
      : undefined;
  const rssResourceEnabled = Boolean(rssEnabled && rssResourceUrl);

  useEffect(() => {
    if (!editingUsername || !token) return;
    const next = pendingUsername.trim().toLowerCase();
    if (!next) {
      setUsernameAvailability({ state: "idle", message: "" });
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameAvailability({ state: "checking", message: "Checking..." });
      try {
        const result = await checkUsernameAvailability(token, next);
        if (result.available) {
          setUsernameAvailability({ state: "available", message: "Available" });
        } else if (result.reason === "taken") {
          setUsernameAvailability({ state: "taken", message: "Username is taken" });
        } else {
          setUsernameAvailability({ state: "invalid", message: result.reason || "Invalid username" });
        }
      } catch {
        setUsernameAvailability({ state: "invalid", message: "Could not validate right now" });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pendingUsername, token, editingUsername]);

  async function saveUsername() {
    if (!token) return;
    if (!canChange) return;
    if (!pendingUsername.trim()) {
      setUsernameAvailability({ state: "invalid", message: "Username is required" });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await patchMe(token, { user_name: pendingUsername.trim().toLowerCase() });
      await refreshUser();
      setUserName(pendingUsername.trim().toLowerCase());
      setEditingUsername(false);
      setSaved("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update username");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-14 w-14 rounded-lg" />
        </div>
        <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
        <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
        <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-10 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-md" />
          </div>
        </div>
        <Card>
          <CardHeader className="pb-4 sm:pb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-3 w-64 mb-3" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4 sm:pb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-10 w-20" />
            <div className="border-t pt-5 mt-2 space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-lg border bg-white px-4 py-3">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-9 w-16" />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3">
                <div className="space-y-0.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-9 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>

      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Blog favicon</p>
              <p className="text-sm text-muted-foreground">
                Ideal 512×512px, max 256KB.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white">
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

          <div className="rounded-xl border border-border/80 bg-white p-4 sm:p-5 space-y-1">
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

          <div className="rounded-xl border border-border/80 bg-white p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between gap-4 sm:gap-6">
              <p className="text-sm font-medium">RSS feed</p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 min-h-0"
                  disabled={!rssResourceEnabled}
                  onClick={() => {
                    if (rssResourceUrl) {
                      window.open(rssResourceUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  View
                </Button>
                <Switch
                  checked={rssEnabled}
                  onCheckedChange={saveRss}
                  disabled={busy}
                />
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              When enabled, RSS icon appears in the footer.
            </p>
          </div>



      <Card>
        <CardHeader className="pb-4 sm:pb-4">
          <CardTitle className="text-xl">Subdomain</CardTitle>
          <CardDescription>Manage your blog's subdomain.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {!editingUsername ? (
            <div className="space-y-3">
              <div className="flex max-w-[30ch]">
                <Input
                  value={encodeURIComponent(user_name)}
                  readOnly
                  className="rounded-r-none bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm font-mono text-muted-foreground">
                  .{UGC_DOMAIN}
                </div>
              </div>
              <div className={`flex gap-2 ${!canChange ? "opacity-60" : ""}`}>
                {canChange ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPendingUsername(user_name);
                      setUsernameAvailability({ state: "idle", message: "" });
                      setEditingUsername(true);
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Subdomain changed recently. You can change it again in{" "}
                    {cooldownRemainingDays} day{cooldownRemainingDays === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex max-w-[30ch]">
                <Input
                  value={pendingUsername}
                  onChange={(e) =>
                    setPendingUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())
                  }
                  placeholder="yourusername"
                  className="rounded-r-none"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <div className="flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm font-mono text-muted-foreground">
                  .{UGC_DOMAIN}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="shrink-0 text-sm">
                  {usernameAvailability.state === "checking" ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...
                    </span>
                  ) : usernameAvailability.state === "available" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Available
                    </span>
                  ) : usernameAvailability.state === "taken" || usernameAvailability.state === "invalid" ? (
                    <span className="text-destructive">{usernameAvailability.message}</span>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can change your subdomain once every 7 days.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={saveUsername}
                  disabled={
                    busy ||
                    !canChange ||
                    usernameAvailability.state === "checking" ||
                    usernameAvailability.state === "taken" ||
                    usernameAvailability.state === "invalid"
                  }
                >
                  Save
                </Button>
                <Button variant="outline" onClick={() => setEditingUsername(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4 sm:pb-4">
          <CardTitle className="text-xl">Custom Domain</CardTitle>
          <CardDescription>Use your own domain for your blog.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomDomainSettings />
        </CardContent>
      </Card>

      <SeoSettings />

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
