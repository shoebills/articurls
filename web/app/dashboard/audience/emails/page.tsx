"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiCacheHas, getCachedApiData, getWelcomeEmailSettings, patchWelcomeEmailSettings } from "@/lib/api";
import type { WelcomeEmailSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { WelcomeEmailEditor } from "@/components/editor/welcome-email-editor";
import {
  WELCOME_EMAIL_STARTER_HTML,
  isStoredWelcomeSubjectDefault,
  welcomeEmailSubjectDisplay,
} from "@/lib/welcome-email-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ProGate } from "@/components/pro/pro-gate";

const DELAY_OPTIONS = [
  { value: "0", label: "Immediately after confirm" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "1 day" },
] as const;

function isEmptyBody(html: string): boolean {
  const t = html.trim();
  return !t || t === "<p></p>" || t === "<p><br></p>";
}

export default function AudienceEmailsPage() {
  const { token, isPro, user, loading: authLoading } = useAuth();
  const blogName = (user?.name || "").trim() || "My Blog";
  const defaultSubject = welcomeEmailSubjectDisplay(blogName);

  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<WelcomeEmailSettings>("/user/welcome-email", t);
    return cached?.welcome_email_enabled ?? false;
  });
  const [subject, setSubject] = useState(defaultSubject);
  const [subjectUsesDefault, setSubjectUsesDefault] = useState(true);
  const [bodyHtml, setBodyHtml] = useState(() => {
    if (typeof window === "undefined") return WELCOME_EMAIL_STARTER_HTML;
    const t = localStorage.getItem("articurls_token");
    if (!t) return WELCOME_EMAIL_STARTER_HTML;
    const cached = getCachedApiData<WelcomeEmailSettings>("/user/welcome-email", t);
    return cached?.welcome_email_body_html?.trim() || WELCOME_EMAIL_STARTER_HTML;
  });
  const [delayMinutes, setDelayMinutes] = useState(() => {
    if (typeof window === "undefined") return "0";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "0";
    const cached = getCachedApiData<WelcomeEmailSettings>("/user/welcome-email", t);
    const delay = String(cached?.welcome_email_delay_minutes ?? 0);
    return DELAY_OPTIONS.some((o) => o.value === delay) ? delay : "0";
  });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (!token || !isPro) return false;
    return !apiCacheHas("/user/welcome-email", token);
  });
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [initial, setInitial] = useState<{
    enabled: boolean;
    subject: string;
    subjectUsesDefault: boolean;
    bodyHtml: string;
    delayMinutes: string;
  } | null>(null);

  const justLoadedRef = useRef(false);

  useEffect(() => {
    if (subjectUsesDefault) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject, subjectUsesDefault]);

  const load = useCallback(async () => {
    if (!token || !isPro) {
      setLoading(false);
      return;
    }
    try {
      const settings = await getWelcomeEmailSettings(token);
      const storedSubject = settings.welcome_email_subject;
      const isDefault = isStoredWelcomeSubjectDefault(storedSubject, blogName);
      const initialSubject = isDefault
        ? welcomeEmailSubjectDisplay(blogName)
        : (storedSubject || "").trim();
      const storedBody = settings.welcome_email_body_html?.trim();
      const initialBody = storedBody || WELCOME_EMAIL_STARTER_HTML;
      const delay = String(settings.welcome_email_delay_minutes ?? 0);
      const finalDelay = DELAY_OPTIONS.some((o) => o.value === delay) ? delay : "0";

      setEnabled(settings.welcome_email_enabled);
      setSubject(initialSubject);
      setSubjectUsesDefault(isDefault);
      setBodyHtml(initialBody);
      setDelayMinutes(finalDelay);
      setInitial({
        enabled: settings.welcome_email_enabled,
        subject: initialSubject,
        subjectUsesDefault: isDefault,
        bodyHtml: initialBody,
        delayMinutes: finalDelay,
      });
      justLoadedRef.current = true;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load welcome email settings");
    } finally {
      setLoading(false);
    }
  }, [token, isPro, blogName]);

  const dirty =
    initial !== null &&
    (enabled !== initial.enabled ||
      subject !== initial.subject ||
      bodyHtml !== initial.bodyHtml ||
      delayMinutes !== initial.delayMinutes);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    if (!token || !isPro) return;
    setBusy(true);
    setErr(null);
    try {
      await patchWelcomeEmailSettings(token, {
        welcome_email_enabled: enabled,
        welcome_email_subject:
          subjectUsesDefault || subject.trim() === defaultSubject ? null : subject.trim(),
        welcome_email_body_html: isEmptyBody(bodyHtml) ? null : bodyHtml,
        welcome_email_delay_minutes: Number(delayMinutes),
      });
      setInitial({
        enabled,
        subject,
        subjectUsesDefault,
        bodyHtml,
        delayMinutes,
      });
      setSavedMsg("Saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save welcome email settings");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleWelcome(nextValue: boolean) {
    if (!token || !isPro) return;
    const previous = enabled;
    setEnabled(nextValue);
    setBusy(true);
    setErr(null);
    try {
      await patchWelcomeEmailSettings(token, { welcome_email_enabled: nextValue });
      setInitial((prev) => prev ? { ...prev, enabled: nextValue } : null);
      setSavedMsg("Saved");
    } catch (e) {
      setEnabled(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to update welcome email");
    } finally {
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex w-full items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle>Welcome email automation</CardTitle>
                <CardDescription>
                  Send a welcome email to new subscribers.
                </CardDescription>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full max-w-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-[320px] w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-20" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">

        <ProGate>
          <Card>
            <CardHeader>
              <div className="flex w-full items-center justify-between gap-4">
                <CardTitle>Welcome email automation</CardTitle>
                <Switch
                  checked={enabled}
                  onCheckedChange={onToggleWelcome}
                  disabled={busy}
                  aria-label="Enable welcome email"
                />
              </div>
              <CardDescription>
                Send a welcome email to new subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="welcome-delay">Send delay</Label>
                <Select value={delayMinutes} onValueChange={setDelayMinutes} disabled={!enabled || busy}>
                  <SelectTrigger id="welcome-delay" className="mt-2 max-w-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-subject">Subject</Label>
                <Input
                  id="welcome-subject"
                  className="mt-2"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setSubjectUsesDefault(false);
                  }}
                  disabled={!enabled || busy}
                />
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <WelcomeEmailEditor
                className="mt-2"
                content={bodyHtml}
                onChange={(html) => {
                  if (justLoadedRef.current) {
                    justLoadedRef.current = false;
                    setInitial((prev) => prev ? { ...prev, bodyHtml: html } : null);
                  }
                  setBodyHtml(html);
                }}
                disabled={!enabled || busy}
                />
              </div>

              <Button onClick={onSave} disabled={busy || !dirty}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </CardContent>
          </Card>
        </ProGate>
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
