"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  getWelcomeEmailSettings,
  patchWelcomeEmailSettings,
  previewWelcomeEmail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { WelcomeEmailEditor } from "@/components/editor/welcome-email-editor";
import { WELCOME_EMAIL_STARTER_HTML } from "@/lib/welcome-email-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const DELAY_OPTIONS = [
  { value: "0", label: "Immediately after confirm" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "360", label: "6 hours" },
  { value: "1440", label: "1 day" },
] as const;

function isEmptyBody(html: string): boolean {
  const t = html.trim();
  return !t || t === "<p></p>" || t === "<p><br></p>";
}

export default function AudienceEmailsPage() {
  const { token, isPro } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [useDefaultBody, setUseDefaultBody] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState("0");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState("edit");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !isPro) return;
    try {
      const settings = await getWelcomeEmailSettings(token);
      setEnabled(settings.welcome_email_enabled);
      setSubject(settings.welcome_email_subject || "");
      const storedBody = settings.welcome_email_body_html || "";
      const hasCustom = Boolean(storedBody.trim());
      setUseDefaultBody(!hasCustom);
      setBodyHtml(hasCustom ? storedBody : WELCOME_EMAIL_STARTER_HTML);
      const delay = String(settings.welcome_email_delay_minutes ?? 0);
      setDelayMinutes(DELAY_OPTIONS.some((o) => o.value === delay) ? delay : "0");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load welcome email settings");
    }
  }, [token, isPro]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPreview = useCallback(async () => {
    if (!token || !isPro) return;
    setPreviewBusy(true);
    setErr(null);
    try {
      const result = await previewWelcomeEmail(token, {
        welcome_email_subject: subject.trim() || null,
        welcome_email_body_html: useDefaultBody ? null : bodyHtml,
        use_default_body: useDefaultBody,
      });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
    } catch (e) {
      setPreviewHtml(null);
      setErr(e instanceof ApiError ? e.message : "Failed to load preview");
    } finally {
      setPreviewBusy(false);
    }
  }, [token, isPro, subject, bodyHtml, useDefaultBody]);

  useEffect(() => {
    if (editorTab === "preview" && isPro && token) {
      void loadPreview();
    }
  }, [editorTab, loadPreview, isPro, token]);

  async function onSave() {
    if (!token || !isPro) return;
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchWelcomeEmailSettings(token, {
        welcome_email_enabled: enabled,
        welcome_email_subject: subject.trim() || null,
        welcome_email_body_html: useDefaultBody || isEmptyBody(bodyHtml) ? null : bodyHtml,
        welcome_email_delay_minutes: Number(delayMinutes),
      });
      setSaved(true);
      if (editorTab === "preview") {
        void loadPreview();
      }
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

  function onToggleCustomMessage(next: boolean) {
    setUseDefaultBody(!next);
    if (next && isEmptyBody(bodyHtml)) {
      setBodyHtml(WELCOME_EMAIL_STARTER_HTML);
    }
    setSaved(false);
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
                    Customize the message or use the built-in template. Every send uses the same polished email layout.
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
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Welcome to {{ blog_name }}'s blog"
                  disabled={!enabled || busy}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Label htmlFor="custom-message">Custom message</Label>
                  <p className="text-sm text-muted-foreground">
                    {useDefaultBody
                      ? "Using the built-in welcome template."
                      : "Editing your own welcome copy inside the email layout."}
                  </p>
                </div>
                <Switch
                  id="custom-message"
                  checked={!useDefaultBody}
                  onCheckedChange={onToggleCustomMessage}
                  disabled={!enabled || busy}
                  aria-label="Use custom welcome message"
                />
              </div>

              <Tabs
                value={editorTab}
                onValueChange={setEditorTab}
                className={!enabled || useDefaultBody ? "pointer-events-none opacity-50" : undefined}
              >
                <TabsList className="grid w-full max-w-xs grid-cols-2">
                  <TabsTrigger value="edit" disabled={!enabled || useDefaultBody}>
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" disabled={!enabled || useDefaultBody}>
                    Preview
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="mt-4 space-y-2">
                  {!useDefaultBody ? (
                    <WelcomeEmailEditor
                      content={bodyHtml}
                      onChange={(html) => {
                        setBodyHtml(html);
                        setSaved(false);
                      }}
                      disabled={!enabled || busy}
                    />
                  ) : null}
                </TabsContent>
                <TabsContent value="preview" className="mt-4">
                  {previewBusy ? (
                    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                      Loading preview…
                    </div>
                  ) : previewHtml ? (
                    <div className="space-y-2">
                      {previewSubject ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Subject:</span> {previewSubject}
                        </p>
                      ) : null}
                      <div className="overflow-hidden rounded-lg border border-border bg-[#f4f4f4]">
                        <iframe
                          title="Welcome email preview"
                          srcDoc={previewHtml}
                          className="h-[520px] w-full border-0 bg-white"
                          sandbox=""
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Switch to Preview to see your email.</p>
                  )}
                </TabsContent>
              </Tabs>

              {useDefaultBody && enabled ? (
                <div className="overflow-hidden rounded-lg border border-border bg-[#f4f4f4] p-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Default template preview — enable Custom message to edit copy.
                  </p>
                  <DefaultTemplatePreview token={token} subject={subject} />
                </div>
              ) : null}

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

function DefaultTemplatePreview({ token, subject }: { token: string | null; subject: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await previewWelcomeEmail(token, {
          welcome_email_subject: subject.trim() || null,
          use_default_body: true,
        });
        if (!cancelled) setHtml(result.html);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, subject]);

  if (!html) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-white/80 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <iframe
      title="Default welcome email preview"
      srcDoc={html}
      className="h-[480px] w-full rounded-lg border-0 bg-white"
      sandbox=""
    />
  );
}
