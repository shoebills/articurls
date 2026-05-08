"use client";

import { useEffect, useState } from "react";
import { ApiError, getCustomDomain, getMetaSettings, patchMetaSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import type { CustomDomain } from "@/lib/types";

export default function SeoDashboardPage() {
  const { token, refreshUser } = useAuth();
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [domain, setDomain] = useState<CustomDomain | null>(null);
  const seoResourcesEnabled =
    !!domain?.hostname &&
    (domain.domain_status === "active" || domain.domain_status === "grace");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const meta = await getMetaSettings(token);
        setMetaTitle(meta.meta_title || "");
        setMetaDescription(meta.meta_description || "");
        const domainData = await getCustomDomain(token);
        setDomain(domainData);
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
}: {
  label: string;
  url?: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {enabled && url ? url : "Unavailable until custom domain is active or in grace period."}
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
