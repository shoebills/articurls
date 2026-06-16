"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getWelcomeEmailSettings, patchWelcomeEmailSettings } from "@/lib/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DELAY_OPTIONS = [
  { value: "0", label: "Immediately after confirm" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "360", label: "6 hours" },
  { value: "720", label: "12 hours" },
  { value: "1440", label: "1 day" },
] as const;

const WELCOME_EMAIL_EXPANDED_KEY = "articurls:welcome-email-expanded";

function readWelcomeEmailExpanded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(WELCOME_EMAIL_EXPANDED_KEY) === "true";
}

function isEmptyBody(html: string): boolean {
  const t = html.trim();
  return !t || t === "<p></p>" || t === "<p><br></p>";
}

export default function AudienceEmailsPage() {
  const { token, isPro, user } = useAuth();
  const blogName = (user?.name || "").trim() || "My Blog";
  const defaultSubject = welcomeEmailSubjectDisplay(blogName);

  const [enabled, setEnabled] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [subjectUsesDefault, setSubjectUsesDefault] = useState(true);
  const [bodyHtml, setBodyHtml] = useState(WELCOME_EMAIL_STARTER_HTML);
  const [delayMinutes, setDelayMinutes] = useState("0");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [initial, setInitial] = useState<{
    enabled: boolean;
    subject: string;
    subjectUsesDefault: boolean;
    bodyHtml: string;
    delayMinutes: string;
  } | null>(null);

  useEffect(() => {
    setExpanded(readWelcomeEmailExpanded());
  }, []);

  const toggleExpanded = useCallback(() => {
    setExpanded((open) => {
      const next = !open;
      if (typeof window !== "undefined") {
        localStorage.setItem(WELCOME_EMAIL_EXPANDED_KEY, String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (subjectUsesDefault) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject, subjectUsesDefault]);

  const load = useCallback(async () => {
    if (!token || !isPro) return;
    try {
      const settings = await getWelcomeEmailSettings(token);
      setEnabled(settings.welcome_email_enabled);
      const storedSubject = settings.welcome_email_subject;
      if (isStoredWelcomeSubjectDefault(storedSubject, blogName)) {
        setSubject(welcomeEmailSubjectDisplay(blogName));
        setSubjectUsesDefault(true);
      } else {
        setSubject(storedSubject!.trim());
        setSubjectUsesDefault(false);
      }
      const storedBody = settings.welcome_email_body_html?.trim();
      setBodyHtml(storedBody || WELCOME_EMAIL_STARTER_HTML);
      const delay = String(settings.welcome_email_delay_minutes ?? 0);
      const finalDelay = DELAY_OPTIONS.some((o) => o.value === delay) ? delay : "0";
      setDelayMinutes(finalDelay);
      setInitial({
        enabled: settings.welcome_email_enabled,
        subject: subjectUsesDefault ? welcomeEmailSubjectDisplay(blogName) : (storedSubject || "").trim(),
        subjectUsesDefault: subjectUsesDefault,
        bodyHtml: storedBody || WELCOME_EMAIL_STARTER_HTML,
        delayMinutes: finalDelay,
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load welcome email settings");
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
      setSavedMsg("Saved");
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
        <h2 className="text-xl font-semibold tracking-tight">Email Automation</h2>

        {!isPro ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Upgrade under Billing to enable welcome emails.
          </p>
        ) : (
          <Card>
            <CardHeader
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse welcome email settings" : "Expand welcome email settings"}
              onClick={toggleExpanded}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpanded();
                }
              }}
            >
              <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle>Welcome email</CardTitle>
                  <CardDescription>
                    Send a welcome email to new subscribers.
                  </CardDescription>
                </div>
                <ChevronDown
                  className={cn(
                    "ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    expanded && "rotate-180"
                  )}
                  aria-hidden
                />
              </div>
            </CardHeader>
            {expanded ? (
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2">
                <Label htmlFor="welcome-enable" className="cursor-pointer text-sm font-medium">
                  Enable
                </Label>
                <Switch
                  id="welcome-enable"
                  checked={enabled}
                  onCheckedChange={onToggleWelcome}
                  disabled={busy}
                />
              </div>
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
                  setBodyHtml(html);
                }}
                disabled={!enabled || busy}
                />
              </div>

              <Button onClick={onSave} disabled={busy || !dirty}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </CardContent>
            ) : null}
          </Card>
        )}
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
