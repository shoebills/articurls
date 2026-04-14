"use client";

import { useEffect, useState } from "react";
import { ApiError, getSeoSettings, patchSeoSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function SeoDashboardPage() {
  const { token, refreshUser } = useAuth();
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [robotsMode, setRobotsMode] = useState<"auto" | "custom" | "off">("auto");
  const [robotsCustomRules, setRobotsCustomRules] = useState("");
  const [sitemapEnabled, setSitemapEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const seo = await getSeoSettings(token);
        setSeoTitle(seo.seo_title || "");
        setSeoDescription(seo.seo_description || "");
        setRobotsMode(seo.robots_mode || "auto");
        setRobotsCustomRules(seo.robots_custom_rules || "");
        setSitemapEnabled(seo.sitemap_enabled ?? true);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load SEO settings");
      }
    })();
  }, [token]);

  async function onSave() {
    if (!token) return;
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchSeoSettings(token, {
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        robots_mode: robotsMode,
        robots_custom_rules: robotsMode === "custom" ? robotsCustomRules || null : null,
        sitemap_enabled: sitemapEnabled,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save SEO settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">SEO</h1>
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
          <div className="rounded-lg border border-border/60 p-4">
            <div className="space-y-2">
              <Label htmlFor="robots_mode">Robots.txt behavior</Label>
              <Select
                value={robotsMode}
                onValueChange={(v) => setRobotsMode(v as "auto" | "custom" | "off")}
              >
                <SelectTrigger id="robots_mode">
                  <SelectValue placeholder="Select robots behavior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (recommended)</SelectItem>
                  <SelectItem value="custom">Custom rules</SelectItem>
                  <SelectItem value="off">Block indexing (Disallow all)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Auto handles plan/domain transitions safely and keeps canonical crawling clean.
              </p>
            </div>
            {robotsMode === "custom" ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="robots_custom_rules">Custom robots rules</Label>
                <Textarea
                  id="robots_custom_rules"
                  value={robotsCustomRules}
                  onChange={(e) => setRobotsCustomRules(e.target.value)}
                  placeholder={"Disallow: /private\nAllow: /"}
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <Label htmlFor="sitemap_enabled">Enable sitemap.xml</Label>
              <p className="mt-1 text-xs text-muted-foreground">Lets search engines discover your blog and pages faster.</p>
            </div>
            <Switch id="sitemap_enabled" checked={sitemapEnabled} onCheckedChange={setSitemapEnabled} />
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
