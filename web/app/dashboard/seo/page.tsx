"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getCustomDomain,
  getMe,
  getMetaSettings,
  getSubscription,
  isProSubscription,
  patchMetaSettings,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import type { CustomDomain } from "@/lib/types";
import { MARKETING_ORIGIN } from "@/lib/env";

export default function SeoDashboardPage() {
  const { token, refreshUser } = useAuth();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [rssEnabled, setRssEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [username, setUsername] = useState("");
  const seoResourcesEnabled =
    !!domain?.hostname &&
    (domain.domain_status === "active" || domain.domain_status === "grace");
  const rssResourceUrl = seoResourcesEnabled && domain?.hostname
    ? `https://${domain.hostname}/rss.xml`
    : isPro && username
      ? `${MARKETING_ORIGIN}/${encodeURIComponent(username)}/rss.xml`
      : undefined;
  const rssResourceEnabled = Boolean(rssEnabled && rssResourceUrl);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [meta, domainData, me, subscription] = await Promise.all([
          getMetaSettings(token),
          getCustomDomain(token),
          getMe(token),
          getSubscription(token),
        ]);
        setMetaTitle(meta.meta_title || "");
        setMetaDescription(meta.meta_description || "");
        setRssEnabled(meta.rss_enabled !== false);
        setDomain(domainData);
        setUsername(me.user_name || "");
        setIsPro(isProSubscription(subscription));
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
      await patchMetaSettings(token, {
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        rss_enabled: rssEnabled,
      });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save SEO settings");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleRss(nextValue: boolean) {
    if (!token) return;
    const previous = rssEnabled;
    setRssEnabled(nextValue);
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await patchMetaSettings(token, { rss_enabled: nextValue });
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setRssEnabled(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to update RSS setting");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search Engine Optimization</h1>
      {saved ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Search appearance</CardTitle>
          <CardDescription>Edit your meta title and description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="meta_title">Meta title</Label>
            <Input
              id="meta_title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Your site title on search engines"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="meta_description">Meta description</Label>
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
              Save SEO settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO Resources</CardTitle>
          <CardDescription>Add and verify custom domain to enable sitemap and robots.txt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Enable RSS feed</p>
              <p className="text-xs text-muted-foreground">
                When enabled, your RSS feed appears as an icon in the public footer.
              </p>
            </div>
            <Switch
              checked={rssEnabled}
              onCheckedChange={onToggleRss}
              disabled={busy}
              aria-label="Enable RSS feed"
            />
          </div>
          <SeoResourceRow
            label="sitemap.xml"
            url={domain?.hostname ? `https://${domain.hostname}/sitemap.xml` : undefined}
            enabled={seoResourcesEnabled}
          />
          <SeoResourceRow
            label="robots.txt"
            url={domain?.hostname ? `https://${domain.hostname}/robots.txt` : undefined}
            enabled={seoResourcesEnabled}
          />
          <SeoResourceRow
            label="rss.xml"
            url={rssResourceUrl}
            enabled={rssResourceEnabled}
            unavailableText={
              !isPro
                ? "RSS feed is available on Pro."
                : !rssEnabled
                  ? "Enable RSS feed to publish your feed URL."
                  : "RSS URL unavailable."
            }
          />
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}

function SeoResourceRow({
  label,
  url,
  enabled,
  unavailableText = "Unavailable until custom domain is active or in grace period.",
}: {
  label: string;
  url?: string;
  enabled: boolean;
  unavailableText?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {enabled && url ? url : unavailableText}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!enabled || !url}
        onClick={() => {
          if (enabled && url) {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      >
        View
      </Button>
    </div>
  );
}
