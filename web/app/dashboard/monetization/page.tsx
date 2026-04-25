"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, getMonetizationSettings, listBlogs, patchMonetizationSettings, updateAdsBlogSelection } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogListItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";

export default function MonetizationPage() {
  const { token, isPro, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adCode, setAdCode] = useState("");
  const [adFrequency, setAdFrequency] = useState(3);
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [selectedBlogIds, setSelectedBlogIds] = useState<number[]>([]);

  const publishedBlogs = useMemo(() => blogs.filter((b) => b.status === "published"), [blogs]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [settings, blogItems] = await Promise.all([getMonetizationSettings(token), listBlogs(token)]);
      setAdsEnabled(Boolean(settings.ads_enabled));
      setAdCode(settings.ad_code || "");
      setAdFrequency(Number.isFinite(settings.ad_frequency) ? settings.ad_frequency : 3);
      setBlogs(blogItems);
      const selected = blogItems.filter((b) => b.ads_enabled).map((b) => b.blog_id);
      setSelectedBlogIds(selected);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load monetization settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) return;
    setLoading(true);
    load();
  }, [authLoading, token, load]);

  async function saveAds() {
    if (!token) return;
    if (!isPro) {
      setErr("Upgrade to Pro to save ad settings.");
      return;
    }
    if (adsEnabled && !adCode.trim()) {
      setErr("Please add ad JavaScript code before enabling ads.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await patchMonetizationSettings(token, {
        ads_enabled: adsEnabled,
        ad_code: adCode,
        ad_frequency: Math.max(2, Math.min(10, adFrequency)),
      });
      const updated = await updateAdsBlogSelection(token, selectedBlogIds);
      setBlogs(updated);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save ad settings");
    } finally {
      setSaving(false);
    }
  }

  function handleFrequencyChange(raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setAdFrequency(3);
      return;
    }
    setAdFrequency(Math.max(2, Math.min(10, Math.floor(parsed))));
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Monetization</h1>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Monetization</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure ads and future premium monetization tools.</p>
      </div>

      {!isPro ? (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pro required to enable ads</CardTitle>
            <CardDescription>
              You can review these settings on Free. Ads go live on your public posts after you upgrade and save.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/billing">View billing & plans</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ads</CardTitle>
          <CardDescription>
            Save your ad code once, choose frequency, and pick published posts where ads should appear.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="ads-enabled">Enable ads</Label>
            <Switch id="ads-enabled" checked={adsEnabled} onCheckedChange={setAdsEnabled} disabled={!isPro} />
          </div>

          {adsEnabled ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ad-code">Ad JavaScript code</Label>
                <Textarea
                  id="ad-code"
                  value={adCode}
                  onChange={(e) => setAdCode(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  disabled={!isPro}
                  className="font-mono text-xs sm:text-sm"
                  placeholder={`<script async src="https://example-ad-network.js"></script>\n<div id="ad-slot"></div>\n<script>\n  // ad init code\n</script>`}
                />
                <p className="text-xs text-muted-foreground">
                  Paste your ad network JavaScript snippet. It will render inside a sandboxed iframe.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad-frequency">Ad frequency (every N paragraphs)</Label>
                <Input
                  id="ad-frequency"
                  type="number"
                  min={2}
                  max={10}
                  value={adFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                  disabled={!isPro}
                />
              </div>

              <div className="space-y-2">
                <Label>Select blogs for ads</Label>
                {publishedBlogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published blogs yet.</p>
                ) : (
                  <div className="rounded-lg border border-border p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between sm:w-auto"
                          disabled={!isPro}
                        >
                          {selectedBlogIds.length > 0
                            ? `${selectedBlogIds.length} blog${selectedBlogIds.length === 1 ? "" : "s"} selected`
                            : "Select blogs"}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-80 w-[min(92vw,28rem)] overflow-y-auto">
                        {publishedBlogs.map((blog) => (
                          <DropdownMenuCheckboxItem
                            key={blog.blog_id}
                            checked={selectedBlogIds.includes(blog.blog_id)}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={(checked) => {
                              setSelectedBlogIds((prev) => {
                                if (checked) return Array.from(new Set([...prev, blog.blog_id]));
                                return prev.filter((id) => id !== blog.blog_id);
                              });
                            }}
                          >
                            {blog.title || "Untitled"}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveAds} disabled={saving || !isPro}>
              {saving ? "Saving..." : "Save ads settings"}
            </Button>
            {!isPro ? (
              <p className="text-sm text-muted-foreground">Saving is available on the Pro plan.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paywall blogs</CardTitle>
          <CardDescription>Coming soon.</CardDescription>
        </CardHeader>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
