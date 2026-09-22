"use client";

import { useEffect, useRef, useState } from "react";
import {
  getMe,
  patchMe,
  uploadProfileImage,
  changePassword,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import type { UserSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Pencil, Trash2, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function ProfilePage() {
  const { token, refreshUser, user: ctxUser } = useAuth();
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.name ?? "";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.email ?? "";
  });
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/user/me", t);
  });
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const [pfpDeleteOpen, setPfpDeleteOpen] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const u = await getMe(token);
        setName(u.name);
        setEmail(u.email);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (ctxUser) {
      setName(ctxUser.name);
      setEmail(ctxUser.email);
    }
  }, [ctxUser]);

  const profileDirty = name.trim() !== (ctxUser?.name ?? "") || email.trim() !== (ctxUser?.email ?? "");

  async function save() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSaved(null);
    try {
      await patchMe(token, { name, email });
      await refreshUser();
      setSaved("Saved");
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
    setSaved(null);
    try {
      await patchMe(token, { profile_image_url: null });
      await refreshUser();
      setSaved("Saved");
      setPfpDeleteOpen(false);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPwErr(null);
    setPwSaved(null);

    if (newPassword.length < 8) {
      setPwErr("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErr("Passwords do not match");
      return;
    }

    setPwBusy(true);
    try {
      const res = await changePassword(token, { new_password: newPassword });
      localStorage.setItem("articurls_token", res.access_token);
      localStorage.setItem("articurls_last_login", "password");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("articurls_token_refreshed", { detail: res.access_token })
        );
      }
      setNewPassword("");
      setConfirmPassword("");
      setPwSaved("Password updated successfully");
      await refreshUser();
    } catch (e) {
      setPwErr(e instanceof ApiError ? e.message : "Failed to update password");
    } finally {
      setPwBusy(false);
    }
  }

  const profileImageUrl = ctxUser?.profile_image_url || "";
  const isDefaultProfileImage =
    !profileImageUrl ||
    profileImageUrl.includes("/users/defaults/") ||
    profileImageUrl.includes("/uploads/defaults/");
  const hasCustomProfileImage = Boolean(profileImageUrl) && !isDefaultProfileImage;

  if (loading) {
    return (
      <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-row items-center gap-3 sm:gap-6">
              <Skeleton className="h-[4.875rem] w-[4.875rem] rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-11 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-row items-center gap-3 sm:gap-6">
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
                className="group relative h-[4.875rem] w-[4.875rem] shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted shadow-sm ring-1 ring-black/[0.04] transition-[box-shadow,transform,border-color] duration-200 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={busy}
                onClick={() => pfpInputRef.current?.click()}
                title={hasCustomProfileImage ? "Change photo" : "Upload photo"}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {hasCustomProfileImage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={busy}
                  onClick={() => setPfpDeleteOpen(true)}
                  title="Remove photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="pt-2">
            <Button size="lg" onClick={save} disabled={busy || !profileDirty}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Password</CardTitle>
          <CardDescription>
            {ctxUser?.has_password
              ? "Change your password for signing in with email."
              : "Your account uses Google sign-in. Set a password to also log in with email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  className="mt-2"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <PasswordInput
                  id="confirm-password"
                  className="mt-2"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={pwBusy || !newPassword || !confirmPassword}
              >
                {pwBusy ? "Saving..." : ctxUser?.has_password ? "Update Password" : "Set Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <FloatingErrorToast message={err || pwErr} onDismiss={() => { setErr(null); setPwErr(null); }} />
      {!(err || pwErr) && (
        <FloatingErrorToast
          message={saved || pwSaved}
          onDismiss={() => { setSaved(null); setPwSaved(null); }}
          autoDismissMs={3000}
          variant="success"
        />
      )}

      <Dialog open={pfpDeleteOpen} onOpenChange={setPfpDeleteOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Remove profile photo?</DialogTitle>
            <DialogDescription>Your photo will be replaced with the default avatar.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPfpDeleteOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={removePfp} disabled={busy}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
