"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMe, patchMe, patchProMe, verifyCustomDomain, uploadProfileImage, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { assetUrl } from "@/lib/env";
import { Camera, UserRound } from "lucide-react";

export default function SettingsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [name, setName] = useState("");
  const [user_name, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [seo_title, setSeoTitle] = useState("");
  const [seo_description, setSeoDescription] = useState("");
  const [custom_domain, setCustomDomain] = useState("");
  const [verification_tick, setVerificationTick] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const pfpInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const u = await getMe(token);
      setName(u.name);
      setUserName(u.user_name);
      setEmail(u.email);
      setSeoTitle(u.seo_title || "");
      setSeoDescription(u.seo_description || "");
      setCustomDomain(u.custom_domain || "");
      setVerificationTick(u.verification_tick);
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
      setSeoTitle(ctxUser.seo_title || "");
      setSeoDescription(ctxUser.seo_description || "");
      setCustomDomain(ctxUser.custom_domain || "");
      setVerificationTick(ctxUser.verification_tick);
    }
  }, [ctxUser]);

  async function saveBase() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await patchMe(token, { name, user_name, email, seo_title, seo_description });
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
      await patchProMe(token, { custom_domain: custom_domain || null, verification_tick });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyDns() {
    if (!token || !isPro) return;
    setBusy(true);
    setErr(null);
    try {
      await verifyCustomDomain(token);
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Verification failed");
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

  return (
    <div className="mx-auto max-w-3xl -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      {err && <p className="text-sm leading-relaxed text-destructive">{err}</p>}
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
                aria-label="Change profile photo"
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
            {ctxUser?.profile_image_url ? (
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
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="user_name">Username</Label>
              <Input id="user_name" value={user_name} onChange={(e) => setUserName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="seo_title">Public SEO title</Label>
            <Input id="seo_title" value={seo_title} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="seo_description">Public SEO description</Label>
            <Input id="seo_description" value={seo_description} onChange={(e) => setSeoDescription(e.target.value)} />
          </div>
          <div className="border-t border-border/60 pt-6">
            <Button size="lg" onClick={saveBase} disabled={busy}>
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pro options</CardTitle>
          <CardDescription>Custom domain, verification tick, and footer controls require an active Pro plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPro && (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Upgrade under Billing to edit these.
            </p>
          )}
          <div className="space-y-2.5">
            <Label htmlFor="domain">Custom domain</Label>
            <Input
              id="domain"
              value={custom_domain}
              onChange={(e) => setCustomDomain(e.target.value)}
              disabled={!isPro}
              placeholder="blog.example.com"
            />
          </div>
          <Button variant="outline" size="lg" onClick={verifyDns} disabled={!isPro || busy}>
            Verify DNS
          </Button>
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Verification tick</p>
              <p className="text-sm leading-relaxed text-muted-foreground">Show verified badge on your public profile.</p>
            </div>
            <Switch checked={verification_tick} onCheckedChange={setVerificationTick} disabled={!isPro} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            “Remove footer” is applied on the public site when your account is Pro and configured server-side.
          </p>
          <div className="border-t border-border/60 pt-6">
            <Button size="lg" onClick={savePro} disabled={!isPro || busy}>
              Save Pro settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
