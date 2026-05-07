"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMe,
  patchMe,
  patchProMe,
  uploadProfileImage,
  uploadFavicon,
  deleteFavicon,
  checkUsernameAvailability,
  createUsernameChangeRequest,
  listMyUsernameChangeRequests,
  ApiError,
} from "@/lib/api";
import type { UsernameChangeRequestOut } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Check, Globe, Loader2, Pencil, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl, MARKETING_ORIGIN } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const USERNAME_CHANGE_LIMIT = 5;

export default function SettingsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [name, setName] = useState("");
  const [user_name, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [useDefaultPreviewImage, setUseDefaultPreviewImage] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subscriberCollectionEnabled, setSubscriberCollectionEnabled] = useState(true);
  const [usernameChangeCount, setUsernameChangeCount] = useState(0);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<{
    state: "idle" | "checking" | "available" | "taken" | "invalid";
    message: string;
  }>({ state: "idle", message: "" });
  const [usernameRequestReason, setUsernameRequestReason] = useState("");
  const [usernameRequests, setUsernameRequests] = useState<UsernameChangeRequestOut[]>([]);
  const [requestBusy, setRequestBusy] = useState(false);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconBusy, setFaviconBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const u = await getMe(token);
      setName(u.name);
      setUserName(u.user_name);
      setEmail(u.email);
      setUseDefaultPreviewImage(u.use_default_preview_image ?? true);
      setSubscriberCollectionEnabled(u.subscriber_collection_enabled ?? true);
      setUsernameChangeCount(u.username_change_count || 0);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ctxUser) {
      setName(ctxUser.name);
      setUserName(ctxUser.user_name);
      setEmail(ctxUser.email);
      setUseDefaultPreviewImage(ctxUser.use_default_preview_image ?? true);
      setSubscriberCollectionEnabled(ctxUser.subscriber_collection_enabled ?? true);
      setUsernameChangeCount(ctxUser.username_change_count || 0);
    }
  }, [ctxUser]);

  async function saveBase() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await patchMe(token, {
        name,
        email,
        use_default_preview_image: useDefaultPreviewImage,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePro() {
    if (!token || !isPro) return;
    setBusy(true);
    setErr(null);
    try {
      await patchProMe(token, {
        subscriber_collection_enabled: subscriberCollectionEnabled,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPfp(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file || !token) return;
    setBusy(true);
    setErr(null);
    try {
      await uploadProfileImage(token, file);
      await refreshUser();
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  async function removePfp() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await patchMe(token, { profile_image_url: null });
      await refreshUser();
      setSaved(true);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  const profileImageUrl = ctxUser?.profile_image_url || "";
  const isDefaultProfileImage =
    !profileImageUrl ||
    profileImageUrl.includes("/users/defaults/") ||
    profileImageUrl.includes("/uploads/defaults/");
  const hasCustomProfileImage = Boolean(profileImageUrl) && !isDefaultProfileImage;

  const usernameChangesRemaining = Math.max(0, USERNAME_CHANGE_LIMIT - usernameChangeCount);
  const normalizedPending = (pendingUsername || user_name || "").trim().toLowerCase();
  const activeCustomDomain =
    ctxUser?.custom_domain && (ctxUser.domain_status === "active" || ctxUser.domain_status === "grace")
      ? ctxUser.custom_domain
      : null;
  const liveProfileUrl = activeCustomDomain
    ? `https://${activeCustomDomain}`
    : `${MARKETING_ORIGIN}/${encodeURIComponent(normalizedPending)}`;

  useEffect(() => {
    if (!usernameDialogOpen || !token) return;
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
  }, [pendingUsername, token, usernameDialogOpen]);

  useEffect(() => {
    if (!usernameDialogOpen || !token) return;
    (async () => {
      try {
        const rows = await listMyUsernameChangeRequests(token);
        setUsernameRequests(rows);
      } catch {
        // Non-blocking for dialog UX.
      }
    })();
  }, [token, usernameDialogOpen]);

  async function saveUsername() {
    if (!token) return;
    if (usernameChangesRemaining <= 0) {
      setUsernameAvailability({ state: "invalid", message: "No username changes remaining" });
      return;
    }
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
      setUsernameDialogOpen(false);
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update username");
    } finally {
      setBusy(false);
    }
  }

  async function submitUsernameChangeRequest() {
    if (!token) return;
    if (!pendingUsername.trim()) {
      setUsernameAvailability({ state: "invalid", message: "Username is required" });
      return;
    }
    setRequestBusy(true);
    setErr(null);
    try {
      await createUsernameChangeRequest(token, {
        desired_username: pendingUsername.trim().toLowerCase(),
        reason: usernameRequestReason.trim() || undefined,
      });
      const rows = await listMyUsernameChangeRequests(token);
      setUsernameRequests(rows);
      setUsernameRequestReason("");
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not submit request");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      {saved && <p className="text-sm font-medium text-emerald-600">Saved.</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative inline-flex shrink-0">
              <input
                ref={pfpInputRef}
                id="pfp"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onPfp}
                disabled={busy}
                aria-hidden
                tabIndex={-1}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => pfpInputRef.current?.click()}
                className="group relative h-[6.5rem] w-[6.5rem] shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted shadow-sm ring-1 ring-black/[0.04] transition-[box-shadow,transform,border-color] duration-200 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                aria-label={hasCustomProfileImage ? "Change profile photo" : "Upload profile photo"}
              >
                {ctxUser?.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(ctxUser.profile_image_url)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UserRound className="h-11 w-11 opacity-70" aria-hidden />
                  </div>
                )}
                <span
                  className="pointer-events-none absolute inset-0 rounded-full bg-black/0 transition-colors duration-200 group-hover:bg-black/[0.12] group-focus-visible:bg-black/10"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[42%] min-h-[3rem] flex-col items-center justify-end bg-gradient-to-t from-black/70 via-black/35 to-transparent pb-2.5 text-white"
                  aria-hidden
                >
                  <Camera className="h-[1.125rem] w-[1.125rem] opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" strokeWidth={1.75} />
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-fit shrink-0"
                disabled={busy}
                onClick={() => pfpInputRef.current?.click()}
              >
                {hasCustomProfileImage ? "Change photo" : "Upload photo"}
              </Button>
              {hasCustomProfileImage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-fit shrink-0 border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive"
                  disabled={busy}
                  onClick={removePfp}
                >
                  Remove photo
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="user_name">Username</Label>
              <div className="flex items-center gap-2">
                <Input id="user_name" value={user_name} readOnly className="h-12 min-h-12 bg-muted/30 sm:h-10 sm:min-h-10" />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-h-12 w-12 shrink-0 rounded-xl p-0 sm:h-10 sm:min-h-10 sm:w-auto sm:px-3.5"
                  onClick={() => {
                    setPendingUsername(user_name);
                    setUsernameAvailability({ state: "idle", message: "" });
                    setUsernameDialogOpen(true);
                  }}
                  aria-label="Edit username"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Edit</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Default preview image fallback</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Use your global default preview image when a post has no featured image and no inline image.
              </p>
            </div>
            <Switch checked={useDefaultPreviewImage} onCheckedChange={setUseDefaultPreviewImage} />
          </div>
          <div className="border-t border-border/60 pt-6">
            <Button size="lg" onClick={saveBase} disabled={busy}>
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pro options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPro && (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Upgrade under Billing to edit these.
            </p>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Blog favicon</Label>
              <p className="text-sm text-muted-foreground">
                Custom favicon shown in browser tabs for your blog. Recommended: 512×512 PNG, max 256KB.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
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
                disabled={!isPro || faviconBusy}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isPro || faviconBusy}
                  onClick={() => faviconInputRef.current?.click()}
                >
                  {faviconBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {ctxUser?.favicon_url ? "Change favicon" : "Upload favicon"}
                </Button>
                {ctxUser?.favicon_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    disabled={!isPro || faviconBusy}
                    onClick={async () => {
                      if (!token) return;
                      setFaviconBusy(true);
                      setErr(null);
                      try {
                        await deleteFavicon(token);
                        await refreshUser();
                      } catch (ex) {
                        setErr(ex instanceof ApiError ? ex.message : "Could not remove favicon");
                      } finally {
                        setFaviconBusy(false);
                      }
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Collect subscribers</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Show the subscribe button in your public navigation and below blog posts.
              </p>
            </div>
            <Switch
              checked={isPro ? subscriberCollectionEnabled : false}
              onCheckedChange={setSubscriberCollectionEnabled}
              disabled={!isPro || busy}
            />
          </div>
          <div className="pt-2">
            <Button size="lg" onClick={savePro} disabled={!isPro || busy}>
              Save Pro settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Change username</DialogTitle>
            <DialogDescription>
              You can change your username up to {USERNAME_CHANGE_LIMIT} times. Remaining: {usernameChangesRemaining}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="username-dialog">Username</Label>
              <Input
                id="username-dialog"
                value={pendingUsername}
                onChange={(e) => setPendingUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase())}
                placeholder="yourusername"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <p className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-all">
              {liveProfileUrl}
            </p>
            <div className="min-h-5 text-sm">
              {usernameAvailability.state === "checking" ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking...
                </span>
              ) : usernameAvailability.state === "available" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Available
                </span>
              ) : usernameAvailability.message ? (
                <span className="text-destructive">{usernameAvailability.message}</span>
              ) : null}
            </div>
            {usernameChangesRemaining <= 0 ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  You have reached the self-service limit. Submit an admin review request for legal, safety, or trademark cases.
                </p>
                <Textarea
                  value={usernameRequestReason}
                  onChange={(e) => setUsernameRequestReason(e.target.value)}
                  placeholder="Reason for admin review (optional)"
                  className="min-h-20"
                />
                <Button type="button" variant="outline" onClick={submitUsernameChangeRequest} disabled={requestBusy}>
                  {requestBusy ? "Submitting..." : "Request admin change"}
                </Button>
                {usernameRequests.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Latest request: {usernameRequests[0].status}
                    {usernameRequests[0].admin_note ? ` - ${usernameRequests[0].admin_note}` : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUsernameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveUsername}
              disabled={
                busy ||
                usernameChangesRemaining <= 0 ||
                usernameAvailability.state === "checking" ||
                usernameAvailability.state === "taken" ||
                usernameAvailability.state === "invalid"
              }
            >
              {usernameChangesRemaining <= 0 ? "Save disabled" : "Save username"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
