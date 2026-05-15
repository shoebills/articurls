"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getWelcomeEmailSettings, patchWelcomeEmailSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const DELAY_OPTIONS = [
  { value: "0", label: "Immediately after confirm" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "360", label: "6 hours" },
  { value: "1440", label: "1 day" },
] as const;

export default function AudienceEmailsPage() {
  const { token, isPro } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("0");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !isPro) return;
    try {
      const settings = await getWelcomeEmailSettings(token);
      setEnabled(settings.welcome_email_enabled);
      setSubject(settings.welcome_email_subject || "");
      setBodyHtml(settings.welcome_email_body_html || "");
      const delay = String(settings.welcome_email_delay_minutes ?? 0);
      setDelayMinutes(DELAY_OPTIONS.some((o) => o.value === delay) ? delay : "0");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load welcome email settings");
    }
  }, [token, isPro]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    if (!token || !isPro) return;
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchWelcomeEmailSettings(token, {
        welcome_email_enabled: enabled,
        welcome_email_subject: subject.trim() || null,
        welcome_email_body_html: bodyHtml.trim() || null,
        welcome_email_delay_minutes: Number(delayMinutes),
      });
      setSaved(true);
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
    setSaved(false);
    setErr(null);
    try {
      await patchWelcomeEmailSettings(token, { welcome_email_enabled: nextValue });
      setSaved(true);
    } catch (e) {
      setEnabled(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to update welcome email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Email Automation</h2>
          <p className="text-sm text-muted-foreground">
            Send a welcome email after a subscriber confirms their subscription.
          </p>
        </section>

        {!isPro ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Upgrade under Billing to enable welcome emails.
          </p>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Welcome email</CardTitle>
                  <CardDescription>
                    Uses a default template unless you customize the subject and HTML body below.
                  </CardDescription>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={onToggleWelcome}
                  disabled={busy}
                  aria-label="Enable welcome email"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {saved ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

              <div className="space-y-2">
                <Label htmlFor="welcome-delay">Send delay</Label>
                <Select value={delayMinutes} onValueChange={setDelayMinutes} disabled={!enabled || busy}>
                  <SelectTrigger id="welcome-delay" className="max-w-sm">
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
                <Label htmlFor="welcome-subject">Subject (optional)</Label>
                <Input
                  id="welcome-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to {{ blog_name }}'s blog"
                  disabled={!enabled || busy}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-body">HTML body (optional)</Label>
                <Textarea
                  id="welcome-body"
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="Leave empty for the default template. Merge tags: {{ blog_name }}, {{ blog_url }}, {{ unsubscribe_url }}"
                  rows={8}
                  disabled={!enabled || busy}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={onSave} disabled={busy}>
                {busy ? "Saving…" : "Save welcome email"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
