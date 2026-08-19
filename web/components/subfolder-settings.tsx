"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check, AlertCircle, Loader2, FolderTree, Cloud, ExternalLink, Trash2 } from "lucide-react";
import {
  getSubfolderSettings,
  updateSubfolderSettings,
  deleteSubfolderSettings,
  getCloudflareConnectUrl,
  disconnectCloudflare,
  getSubfolderSnippets,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SubfolderSettings as ISubfolderSettings, SubfolderSnippets as ISubfolderSnippets } from "@/lib/types";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function SubfolderSettings() {
  const { token } = useAuth();

  const [settings, setSettings] = useState<ISubfolderSettings | null | undefined>(undefined);
  const [snippets, setSnippets] = useState<ISubfolderSnippets | null>(null);
  const [domain, setDomain] = useState("");
  const [subpath, setSubpath] = useState("/blog");
  const [activeTab, setActiveTab] = useState<"cloudflare" | "nextjs" | "nginx" | "caddy">("cloudflare");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectingCf, setConnectingCf] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async (tok: string) => {
    try {
      const data = await getSubfolderSettings(tok);
      setSettings(data);
      if (data.custom_domain) setDomain(data.custom_domain);
      if (data.custom_subpath) setSubpath(data.custom_subpath);

      const snips = await getSubfolderSnippets(tok);
      setSnippets(snips);
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData(token);
  }, [token, loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateSubfolderSettings(token, {
        custom_domain: domain,
        custom_subpath: subpath,
      });
      setSettings(updated);
      const snips = await getSubfolderSnippets(token);
      setSnippets(snips);
      setSuccess("Subfolder configuration saved successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to save subfolder settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConnectCloudflare = async () => {
    if (!token) return;
    setConnectingCf(true);
    setError("");
    try {
      // If user hasn't saved domain yet, save it first
      if (domain) {
        await updateSubfolderSettings(token, {
          custom_domain: domain,
          custom_subpath: subpath,
        });
      }
      const { auth_url } = await getCloudflareConnectUrl(token);
      window.location.href = auth_url;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not initiate Cloudflare OAuth connection.");
      }
      setConnectingCf(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token) return;
    setDisconnecting(true);
    setError("");
    try {
      if (settings?.cf_connected) {
        await disconnectCloudflare(token);
      }
      await deleteSubfolderSettings(token);
      setSettings({
        custom_domain: null,
        custom_subpath: null,
        cf_connected: false,
        is_active: false,
      });
      setDomain("");
      setSubpath("/blog");
      setSuccess("Subfolder deployment removed.");
    } catch (err) {
      setError("Failed to disconnect subfolder.");
    } finally {
      setDisconnecting(false);
    }
  };

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (settings === undefined) {
    return (
      <Card className="rounded-2xl border border-border/80 p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-full mb-3" />
        <Skeleton className="h-10 w-32" />
      </Card>
    );
  }

  const cleanSubpath = subpath.startsWith("/") ? subpath : `/${subpath}`;
  const fullPreviewUrl = domain ? `https://${domain}${cleanSubpath}` : `https://example.com${cleanSubpath}`;

  return (
    <>
      <FloatingErrorToast
        message={error}
        onDismiss={() => setError("")}
        variant="error"
      />
      <FloatingErrorToast
        message={success}
        onDismiss={() => setSuccess("")}
        variant="success"
      />

      <Card className="rounded-2xl border border-border/80 p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-foreground">
              <FolderTree className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Subfolder Publishing</h2>
              <p className="text-xs text-muted-foreground">
                Mount your blog directly inside your main website URL (e.g. <span className="font-mono text-foreground font-medium">example.com/blog</span>) for 100% SEO authority.
              </p>
            </div>
          </div>

          {settings?.is_active ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {settings.cf_connected ? "Cloudflare Synced" : "Subfolder Configured"}
            </div>
          ) : (
            <div className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium">
              1 Free Included
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Main Website Domain</label>
              <Input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Subpath Route</label>
              <Input
                type="text"
                value={subpath}
                onChange={(e) => setSubpath(e.target.value)}
                placeholder="/blog"
                className="font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            Target Public URL: <span className="font-mono font-medium text-foreground">{fullPreviewUrl}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" disabled={saving || !domain}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Configuration
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={connectingCf || !domain}
              onClick={handleConnectCloudflare}
              className="gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
            >
              {connectingCf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 text-orange-500" />
              )}
              {settings?.cf_connected ? "Reconnect Cloudflare" : "Connect with Cloudflare (OAuth)"}
            </Button>

            {settings?.is_active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disconnecting}
                onClick={handleDisconnect}
                className="text-destructive hover:bg-destructive/10 ml-auto"
              >
                {disconnecting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                Disconnect
              </Button>
            ) : null}
          </div>
        </form>

        {/* Reverse Proxy Code Snippets */}
        {snippets ? (
          <div className="mt-8 border-t border-border/60 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Manual Reverse Proxy Configuration
              </h3>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-border pb-2 text-xs">
              {(
                [
                  { key: "cloudflare", label: "Cloudflare Worker" },
                  { key: "nextjs", label: "Next.js Rewrites" },
                  { key: "nginx", label: "Nginx" },
                  { key: "caddy", label: "Caddy" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    activeTab === tab.key
                      ? "bg-foreground font-medium text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative mt-3">
              <pre className="max-h-64 overflow-x-auto rounded-xl border border-border/80 bg-neutral-950 p-4 font-mono text-xs text-neutral-200">
                {activeTab === "cloudflare" && snippets.cloudflare_worker}
                {activeTab === "nextjs" && snippets.nextjs}
                {activeTab === "nginx" && snippets.nginx}
                {activeTab === "caddy" && snippets.caddy}
              </pre>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const content =
                    activeTab === "cloudflare"
                      ? snippets.cloudflare_worker
                      : activeTab === "nextjs"
                      ? snippets.nextjs
                      : activeTab === "nginx"
                      ? snippets.nginx
                      : snippets.caddy;
                  copyCode(content, activeTab);
                }}
                className="absolute right-3 top-3 h-8 gap-1.5 bg-neutral-800 text-xs text-neutral-200 hover:bg-neutral-700"
              >
                {copiedKey === activeTab ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
