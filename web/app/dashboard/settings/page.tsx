"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getMe, patchMe, patchProMe, uploadProfileImage, checkUsernameAvailability, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetUrl, MARKETING_ORIGIN } from "@/lib/env";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Camera, Check, Loader2, Pencil, Plus, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiYoutube,
  SiX,
} from "react-icons/si";
import { MdOutlineEmail } from "react-icons/md";
import { FaLinkedinIn } from "react-icons/fa6";

type SocialPlatform =
  | "contact_email"
  | "instagram_link"
  | "x_link"
  | "pinterest_link"
  | "facebook_link"
  | "linkedin_link"
  | "github_link"
  | "youtube_link";

const SOCIAL_OPTIONS: Array<{
  key: SocialPlatform;
  label: string;
  icon: ReactNode;
  placeholder: string;
}> = [
  { key: "contact_email", label: "Contact email", icon: <MdOutlineEmail className="h-4 w-4" aria-hidden />, placeholder: "hello@example.com" },
  { key: "instagram_link", label: "Instagram", icon: <SiInstagram className="h-4 w-4" aria-hidden />, placeholder: "https://instagram.com/username" },
  { key: "x_link", label: "X (Twitter)", icon: <SiX className="h-4 w-4" aria-hidden />, placeholder: "https://x.com/username" },
  { key: "pinterest_link", label: "Pinterest", icon: <SiPinterest className="h-4 w-4" aria-hidden />, placeholder: "https://pinterest.com/username" },
  { key: "facebook_link", label: "Facebook", icon: <SiFacebook className="h-4 w-4" aria-hidden />, placeholder: "https://facebook.com/username" },
  { key: "linkedin_link", label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" aria-hidden />, placeholder: "https://linkedin.com/in/username" },
  { key: "github_link", label: "GitHub", icon: <SiGithub className="h-4 w-4" aria-hidden />, placeholder: "https://github.com/username" },
  { key: "youtube_link", label: "YouTube", icon: <SiYoutube className="h-4 w-4" aria-hidden />, placeholder: "https://youtube.com/@username" },
];

const USERNAME_CHANGE_LIMIT = 5;

export default function SettingsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [name, setName] = useState("");
  const [user_name, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [link, setLink] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<SocialPlatform, string>>({
    contact_email: "",
    instagram_link: "",
    x_link: "",
    pinterest_link: "",
    facebook_link: "",
    linkedin_link: "",
    github_link: "",
    youtube_link: "",
  });
  const [enabledSocials, setEnabledSocials] = useState<SocialPlatform[]>([]);
  const [addingSocial, setAddingSocial] = useState(false);
  const [socialToAdd, setSocialToAdd] = useState<SocialPlatform | "">("");
  const [verification_tick, setVerificationTick] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usernameChangeCount, setUsernameChangeCount] = useState(0);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [pendingUsername, setPendingUsername] = useState("");
  const [usernameAvailability, setUsernameAvailability] = useState<{
    state: "idle" | "checking" | "available" | "taken" | "invalid";
    message: string;
  }>({ state: "idle", message: "" });
  const pfpInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const u = await getMe(token);
      setName(u.name);
      setUserName(u.user_name);
      setEmail(u.email);
      setBio(u.bio || "");
      setLink(u.link || "");
      const nextLinks: Record<SocialPlatform, string> = {
        contact_email: u.contact_email || "",
        instagram_link: u.instagram_link || "",
        x_link: u.x_link || "",
        pinterest_link: u.pinterest_link || "",
        facebook_link: u.facebook_link || "",
        linkedin_link: u.linkedin_link || "",
        github_link: u.github_link || "",
        youtube_link: u.youtube_link || "",
      };
      setSocialLinks(nextLinks);
      setEnabledSocials(
        SOCIAL_OPTIONS.map((s) => s.key).filter((key) => (nextLinks[key] || "").trim() !== "")
      );
      setVerificationTick(u.verification_tick);
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
      setBio(ctxUser.bio || "");
      setLink(ctxUser.link || "");
      const nextLinks: Record<SocialPlatform, string> = {
        contact_email: ctxUser.contact_email || "",
        instagram_link: ctxUser.instagram_link || "",
        x_link: ctxUser.x_link || "",
        pinterest_link: ctxUser.pinterest_link || "",
        facebook_link: ctxUser.facebook_link || "",
        linkedin_link: ctxUser.linkedin_link || "",
        github_link: ctxUser.github_link || "",
        youtube_link: ctxUser.youtube_link || "",
      };
      setSocialLinks(nextLinks);
      setEnabledSocials(
        SOCIAL_OPTIONS.map((s) => s.key).filter((key) => (nextLinks[key] || "").trim() !== "")
      );
      setVerificationTick(ctxUser.verification_tick);
      setUsernameChangeCount(ctxUser.username_change_count || 0);
    }
  }, [ctxUser]);

  async function saveBase() {
    if (!token) return;
    if ((bio.trim() ? bio.trim().split(/\s+/).length : 0) > 200) {
      setErr("Bio must be 200 words or fewer");
      return;
    }
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await patchMe(token, {
        name,
        email,
        bio,
        link,
        contact_email: socialLinks.contact_email || null,
        instagram_link: socialLinks.instagram_link || null,
        x_link: socialLinks.x_link || null,
        pinterest_link: socialLinks.pinterest_link || null,
        facebook_link: socialLinks.facebook_link || null,
        linkedin_link: socialLinks.linkedin_link || null,
        github_link: socialLinks.github_link || null,
        youtube_link: socialLinks.youtube_link || null,
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
      await patchProMe(token, { verification_tick });
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

  const hiddenSocialOptions = SOCIAL_OPTIONS.filter((s) => !enabledSocials.includes(s.key));
  const profileImageUrl = ctxUser?.profile_image_url || "";
  const isDefaultProfileImage =
    !profileImageUrl ||
    profileImageUrl.includes("/users/defaults/") ||
    profileImageUrl.includes("/uploads/defaults/");
  const hasCustomProfileImage = Boolean(profileImageUrl) && !isDefaultProfileImage;

  function addSocial() {
    if (!socialToAdd) return;
    setEnabledSocials((prev) => (prev.includes(socialToAdd) ? prev : [...prev, socialToAdd]));
    setAddingSocial(false);
    setSocialToAdd("");
  }

  const usernameChangesRemaining = Math.max(0, USERNAME_CHANGE_LIMIT - usernameChangeCount);
  const normalizedPending = (pendingUsername || user_name || "").trim().toLowerCase();
  const liveProfileUrl = `${MARKETING_ORIGIN}/${encodeURIComponent(normalizedPending)}`;

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
              <p className="text-xs text-muted-foreground">
                {usernameChangesRemaining} of {USERNAME_CHANGE_LIMIT} username changes remaining
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1400}
              placeholder="Optional short bio (max 200 words)"
            />
            <p className="text-xs text-muted-foreground">{bio.trim() ? bio.trim().split(/\s+/).length : 0}/200 words</p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="link">Link in bio</Label>
            <Input
              id="link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-3">
            <Label>Socials</Label>
            {enabledSocials.length > 0 ? (
              <div className="space-y-3">
                {enabledSocials.map((platformKey) => {
                  const option = SOCIAL_OPTIONS.find((s) => s.key === platformKey);
                  if (!option) return null;
                  return (
                    <div key={platformKey} className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                        {option.icon}
                      </div>
                      <Input
                        type={platformKey === "contact_email" ? "email" : "url"}
                        value={socialLinks[platformKey]}
                        onChange={(e) =>
                          setSocialLinks((prev) => ({
                            ...prev,
                            [platformKey]: e.target.value,
                          }))
                        }
                        placeholder={option.placeholder}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setEnabledSocials((prev) => prev.filter((k) => k !== platformKey));
                          setSocialLinks((prev) => ({ ...prev, [platformKey]: "" }));
                        }}
                        aria-label={`Remove ${option.label}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No socials added yet.</p>
            )}

            {hiddenSocialOptions.length > 0 ? (
              addingSocial ? (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <Select value={socialToAdd} onValueChange={(v) => setSocialToAdd(v as SocialPlatform)}>
                    <SelectTrigger className="sm:max-w-xs">
                      <SelectValue placeholder="Select social platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {hiddenSocialOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addSocial} disabled={!socialToAdd}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddingSocial(false);
                        setSocialToAdd("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => {
                    setAddingSocial(true);
                    setSocialToAdd(hiddenSocialOptions[0]?.key || "");
                  }}
                  aria-label="Add social platform"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )
            ) : null}
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
          <CardDescription>Verification tick and footer controls require an active Pro plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isPro && (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              Upgrade under Billing to edit these.
            </p>
          )}
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

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
              Live URL: {liveProfileUrl}
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
              Save username
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
