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
  const [originalMetaTitle, setOriginalMetaTitle] = useState("");
  const [originalMetaDescription, setOriginalMetaDescription] = useState("");
  const [rssEnabled, setRssEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [username, setUsername] = useState("");
  const seoResourcesEnabled =
    !!domain?.hostname &&
    (domain.domain_status === "active" || domain.domain_status === "grace");
  const sitemapResourceUrl = seoResourcesEnabled && domain?.hostname
    ? `https://${domain.hostname}/sitemap.xml`
    : isPro && username
      ? `${MARKETING_ORIGIN}/sitemaps/${encodeURIComponent(username)}/sitemap.xml`
      : undefined;
  const sitemapResourceEnabled = Boolean(sitemapResourceUrl);
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
        setOriginalMetaTitle(meta.meta_title || "");
        setOriginalMetaDescription(meta.meta_description || "");
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
    setErr(null);
    try {
      await patchMetaSettings(token, {
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        rss_enabled: rssEnabled,
      });
      await refreshUser();
      setOriginalMetaTitle(metaTitle);
      setOriginalMetaDescription(metaDescription);
      setSavedMsg("Saved");
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
    setErr(null);
    try {
      await patchMetaSettings(token, { rss_enabled: nextValue });
      await refreshUser();
      setSavedMsg("Saved");
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

      <Card>
        <CardHeader>
          <CardTitle>Meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <Label htmlFor="meta_title">Meta title</Label>
            <Input
              id="meta_title"
              className="mt-2"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Your site title on search engines"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="meta_description">Meta description</Label>
            <Textarea
              id="meta_description"
              className="mt-2"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Short summary for search previews"
              rows={3}
            />
          </div>
          <div className="pt-4">
            <Button
              onClick={onSave}
              disabled={busy || (metaTitle === originalMetaTitle && metaDescription === originalMetaDescription)}
            >
              Save
            </Button>
          </div>
          <div className="border-t pt-5 mt-2 space-y-3">
            <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">RSS feed</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, your RSS icon appears in the footer.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={rssEnabled}
                  onCheckedChange={onToggleRss}
                  disabled={busy}
                  aria-label="Enable RSS feed"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!rssResourceUrl}
                  onClick={() => {
                    if (rssResourceUrl) {
                      window.open(rssResourceUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  View
                </Button>
              </div>
            </div>
            <SeoResourceRow
              label="Sitemap"
              url={sitemapResourceUrl}
              displayText="sitemap.xml"
              enabled={sitemapResourceEnabled}
              unavailableText={
                !isPro
                  ? "Sitemap is available on Pro."
                  : "Sitemap URL unavailable."
              }
            />
            <SeoResourceRow
              label="Robots control"
              url={domain?.hostname ? `https://${domain.hostname}/robots.txt` : undefined}
              displayText="robots.txt"
              enabled={seoResourcesEnabled}
            />
          </div>
        </CardContent>
      </Card>
      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}

function SeoResourceRow({
  label,
  url,
  enabled,
  unavailableText = "Unavailable until custom domain is active or in grace period.",
  displayText,
}: {
  label: string;
  url?: string;
  enabled: boolean;
  unavailableText?: string;
  displayText?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {enabled && url ? (displayText || url) : unavailableText}
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
