"use client";

import { useState } from "react";
import { submitSupportMessage, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MailCheck } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const CATEGORIES = [
  { value: "Report a bug", label: "Report a bug" },
  { value: "Account issue", label: "Account issue" },
  { value: "General inquiry", label: "General inquiry" },
] as const;

const SUBJECT_SUGGESTIONS: Record<string, string> = {
  "Report a bug": "I ran into a bug",
  "Account issue": "I have an issue with my account",
  "General inquiry": "I have a question",
};

export default function SupportPage() {
  const { token, user } = useAuth();
  const [category, setCategory] = useState<string>("General inquiry");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setErr(null);
    setSent(false);
    try {
      await submitSupportMessage(token, { category, subject: subject.trim(), message: message.trim() });
      setSent(true);
      setMessage("");
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not send your message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Support</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Contact us</CardTitle>
          <CardDescription>
            Tell us what&apos;s going on and we&apos;ll get back to you at {user?.email || "your email"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2.5">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  setSubject((prev) => prev || SUBJECT_SUGGESTIONS[v] || "");
                }}
              >
                <SelectTrigger className="w-full sm:max-w-sm">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question in as much detail as you can."
                rows={6}
                minLength={10}
                maxLength={5000}
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send message"
                )}
              </Button>
              {sent ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <MailCheck className="h-4 w-4" />
                  Message sent — we&apos;ll be in touch.
                </span>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
