"use client";

import { useEffect, useState } from "react";
import { ApiError, getMetaSettings, patchMetaSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function MetaDashboardPage() {
  const { token, refreshUser } = useAuth();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const meta = await getMetaSettings(token);
        setMetaTitle(meta.meta_title || "");
        setMetaDescription(meta.meta_description || "");
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load meta settings");
      }
    })();
  }, [token]);

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchMetaSettings(token, {
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save meta settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meta settings</h1>
      {saved ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Search appearance</CardTitle>
          <CardDescription>Edit your public meta title and meta description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="meta_title">Public meta title</Label>
            <Input
              id="meta_title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Your site title on search engines"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="meta_description">Public meta description</Label>
            <Textarea
              id="meta_description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Short summary for search previews"
              rows={3}
            />
          </div>
          <div className="border-t border-border/60 pt-4">
            <Button onClick={onSave} disabled={busy}>
              Save meta settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
