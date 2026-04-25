"use client";

import { useEffect, useState } from "react";
import { ApiError, getSeoSettings, patchSeoSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function SeoDashboardPage() {
  const { token, refreshUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    setLoading(true);
    (async () => {
      try {
        const seo = await getSeoSettings(token);
        setSeoTitle(seo.seo_title || "");
        setSeoDescription(seo.seo_description || "");
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load SEO settings");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, token]);

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchSeoSettings(token, {
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save SEO settings");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search Engine Optimization</h1>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search Engine Optimization</h1>
      {saved ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Search appearance</CardTitle>
          <CardDescription>Edit your public SEO title and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="seo_title">Public SEO title</Label>
            <Input
              id="seo_title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Your site title on search engines"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="seo_description">Public SEO description</Label>
            <Textarea
              id="seo_description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Short summary for search previews"
              rows={3}
            />
          </div>
          <div className="border-t border-border/60 pt-4">
            <Button onClick={onSave} disabled={busy}>
              Save SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
