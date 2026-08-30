"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCustomDomain,
  getMe,
  getSeoSettings,
  patchSeoSettings,
  patchProMe,
  uploadFavicon,
  deleteFavicon,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import type { CustomDomain, UserSettings } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronRight,
  Code2,
  Copy,
  Globe,
  Loader2,
  PanelBottom,
  PanelTop,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl, UGC_DOMAIN } from "@/lib/env";
import { cn } from "@/lib/utils";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import CustomDomainSettings from "@/components/custom-domain-settings";
import SubfolderSettings from "@/components/subfolder-settings";
import SeoSettings from "@/components/seo-settings";
import { CodeInjectionSettings } from "@/components/code-injection-settings";
import { DesignSettingsPanel } from "@/components/design-settings-panel";
import { NavBuilder } from "@/components/themes/nav-builder";
import { FooterBuilder } from "@/components/themes/footer-builder";

type SettingTab = "general" | "domains" | "seo" | "code" | "nav" | "footer";

interface SettingCardItem {
  id: SettingTab;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface SettingsSection {
  title: string;
  description: string;
  items: SettingCardItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Website",
    description: "Manage your site's core configuration and domain settings.",
    items: [
      {
        id: "general",
        title: "General",
        description: "Site identity, favicon, subscriber collection and RSS feed.",
        icon: SlidersHorizontal,
      },
      {
        id: "domains",
        title: "Domains",
        description: "Subdomain, custom domains and subfolder publishing.",
        icon: Globe,
      },
      {
        id: "nav",
        title: "Header & Navigation",
        description: "Brand name, header style, custom links and CTA buttons.",
        icon: PanelTop,
      },
      {
        id: "footer",
        title: "Modular Footer",
        description: "Multi-column link groups, newsletter and copyright.",
        icon: PanelBottom,
      },
    ],
  },
  {
    title: "Growth & Discovery",
    description: "Configure how your site is discovered and optimized for search.",
    items: [
      {
        id: "seo",
        title: "SEO",
        description: "Search engine indexing, metadata and social previews.",
        icon: Search,
      },
    ],
  },
  {
    title: "Advanced",
    description: "Manage technical configuration and custom code.",
    items: [
      {
        id: "code",
        title: "Code Injection",
        description: "Add custom head/body scripts and CSS to your site.",
        icon: Code2,
      },
    ],
  },
];

function SettingsCard({ item, onSelect }: { item: SettingCardItem; onSelect: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-4 rounded-xl border border-border/80 bg-background p-4 text-left shadow-xs transition-[border-color,box-shadow] duration-200 ease-out hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{item.title}</span>
        <span className="block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </button>
  );
}

function SettingsOverviewSkeleton() {
  return (
    <div className="space-y-8 sm:space-y-10">
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div aria-hidden="true" className="h-px bg-border/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            {section.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-border/80 bg-background p-4 sm:p-5"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full max-w-60" />
                </div>
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [subdomain, setSubdomain] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.subdomain ?? "";
  });
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/user/me", t)
    );
  });
  const [collectSubscribers, setCollectSubscribers] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached?.subscriber_collection_enabled ?? false;
  });
  const [rssEnabled, setRssEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const t = localStorage.getItem("articurls_token");
    if (!t) return false;
    const cached = getCachedApiData<UserSettings>("/user/me", t);
    return cached ? cached.rss_enabled !== false : false;
  });
  const [domain, setDomain] = useState<CustomDomain | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<CustomDomain>("/settings/domain", t) : null;
  });
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [faviconDeleteOpen, setFaviconDeleteOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<SettingTab | null>(null);

  function openSetting(tab: SettingTab) {
    setSelectedTab(tab);
    window.scrollTo({ top: 0 });
  }

  function closeSetting() {
    setSelectedTab(null);
    window.scrollTo({ top: 0 });
  }

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [u, _, domainData] = await Promise.all([
        getMe(token),
        getSeoSettings(token),
        getCustomDomain(token),
      ]);
      setSubdomain(u.subdomain);
      setCollectSubscribers(u.subscriber_collection_enabled ?? false);
      setDomain(domainData);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ctxUser) {
      setSubdomain(ctxUser.subdomain);
      setCollectSubscribers(ctxUser.subscriber_collection_enabled ?? false);
      setRssEnabled(ctxUser.rss_enabled ?? false);
    }
  }, [ctxUser]);

  async function savePro(collect?: boolean) {
    if (!token) return;
    const nextCollect = collect ?? collectSubscribers;
    setBusy(true);
    setErr(null);
    setSaved(null);
    const prevCollect = collectSubscribers;
    try {
      await patchProMe(token, {
        subscriber_collection_enabled: nextCollect,
      });
      await refreshUser();
      setSaved("Saved");
    } catch (e) {
      setCollectSubscribers(prevCollect);
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveRss(nextValue: boolean) {
    if (!token) return;
    const prev = rssEnabled;
    setRssEnabled(nextValue);
    setBusy(true);
    setErr(null);
    setSaved(null);
    try {
      await patchSeoSettings(token, { rss_enabled: nextValue });
      await refreshUser();
      setSaved("Saved");
    } catch (e) {
      setRssEnabled(prev);
      setErr(e instanceof ApiError ? e.message : "Failed to update RSS setting");
    } finally {
      setBusy(false);
    }
  }

  async function removeFavicon() {
    if (!token) return;
    setFaviconBusy(true);
    setErr(null);
    try {
      await deleteFavicon(token);
      await refreshUser();
      setFaviconDeleteOpen(false);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : "Could not remove favicon");
    } finally {
      setFaviconBusy(false);
    }
  }

  const rssResourceUrl = domain?.hostname
    ? `https://${domain.hostname}/rss.xml`
    : subdomain
      ? `https://${encodeURIComponent(subdomain)}.${UGC_DOMAIN}/rss.xml`
      : undefined;
  const rssResourceEnabled = Boolean(rssEnabled && rssResourceUrl);

  return (
    <div className="relative mx-auto max-w-[1100px] -mt-1 space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>

      {selectedTab !== null && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={closeSetting}
          >
            <ArrowLeft className="h-4 w-4" />
            All settings
          </Button>
        </div>
      )}

      {loading ? (
        selectedTab === null ? (
          <SettingsOverviewSkeleton />
        ) : (
          <Skeleton className="h-64 w-full rounded-xl" />
        )
      ) : (
        <>
          {selectedTab === null && (
            <div className="space-y-8 sm:space-y-10">
              {SETTINGS_SECTIONS.map((section) => (
                <section key={section.title} className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold tracking-tight sm:text-lg">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <div aria-hidden="true" className="h-px bg-border/70" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {section.items.map((item) => (
                      <SettingsCard key={item.id} item={item} onSelect={() => openSetting(item.id)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <div className={cn("space-y-6 sm:space-y-8", selectedTab !== "general" && "hidden")}>
          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Blog favicon</p>
              <p className="text-sm text-muted-foreground">
                Ideal 512×512px, max 256KB.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background">
                {ctxUser?.favicon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(ctxUser.favicon_url)}
                    alt="Favicon"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <Globe className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/x-icon,image/svg+xml"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !token) return;
                  if (file.size > 256 * 1024) {
                    setErr("Favicon too large (max 256KB)");
                    e.target.value = "";
                    return;
                  }
                  setFaviconBusy(true);
                  setErr(null);
                  try {
                    await uploadFavicon(token, file);
                    await refreshUser();
                  } catch (ex) {
                    setErr(ex instanceof ApiError ? ex.message : "Favicon upload failed");
                  } finally {
                    setFaviconBusy(false);
                    e.target.value = "";
                  }
                }}
                disabled={faviconBusy}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={faviconBusy}
                  onClick={() => faviconInputRef.current?.click()}
                  title={ctxUser?.favicon_url ? "Change favicon" : "Upload favicon"}
                >
                  {faviconBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
                {ctxUser?.favicon_url ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={faviconBusy}
                    onClick={() => setFaviconDeleteOpen(true)}
                    title="Remove favicon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-background p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between gap-4 sm:gap-6">
              <p className="text-sm font-medium">Collect subscribers</p>
              <Switch
                checked={collectSubscribers}
                onCheckedChange={(v) => {
                  setCollectSubscribers(v);
                  void savePro(v);
                }}
                disabled={busy}
              />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Show the subscribe button in your blog menu and below blog posts.
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-background p-4 sm:p-5 space-y-1">
            <div className="flex items-center justify-between gap-4 sm:gap-6">
              <p className="text-sm font-medium">RSS feed</p>
              <Switch
                checked={rssEnabled}
                onCheckedChange={(v) => {
                  setRssEnabled(v);
                  void saveRss(v);
                }}
                disabled={busy}
              />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              When enabled, RSS icon appears in the blog footer.
            </p>
          </div>
        </div>

      <div className={cn("space-y-6 sm:space-y-8", selectedTab !== "domains" && "hidden")}>
          <Card>
            <CardHeader className="pb-4 sm:pb-4">
              <CardTitle className="text-xl">Subdomain</CardTitle>
              <CardDescription>Your blog&apos;s permanent subdomain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex max-w-[30ch]">
                <Input
                  value={encodeURIComponent(subdomain)}
                  readOnly
                  className="rounded-l-lg rounded-r-none border border-r-0 bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex shrink-0 items-center rounded-r-lg border bg-muted/40 px-3 text-sm font-mono text-muted-foreground">
                  .{UGC_DOMAIN}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This cannot be changed later, but you can connect a custom domain anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-4">
              <CardTitle className="text-xl">Custom Domain (Subdomain)</CardTitle>
              <CardDescription>Point a standalone custom domain or subdomain (e.g. blog.yourcompany.com) to your blog.</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomDomainSettings />
            </CardContent>
          </Card>

          <SubfolderSettings />
        </div>

      <div className={cn(selectedTab !== "seo" && "hidden")}>
        <SeoSettings />
      </div>

      <div className={cn(selectedTab !== "code" && "hidden")}>
        <CodeInjectionSettings />
      </div>

      <div className={cn(selectedTab !== "nav" && "hidden")}>
        <DesignSettingsPanel
          title="Header & Navigation"
          description="Configure brand name, alignment, header styling, custom links, and CTA buttons."
          render={(design, onChange) => <NavBuilder settings={design} onChange={onChange} />}
        />
      </div>

      <div className={cn(selectedTab !== "footer" && "hidden")}>
        <DesignSettingsPanel
          title="Modular Footer"
          description="Build multi-column link groups, toggle newsletter subscription, and configure copyright notices."
          render={(design, onChange) => <FooterBuilder settings={design} onChange={onChange} />}
        />
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      {!err && <FloatingErrorToast message={saved} onDismiss={() => setSaved(null)} autoDismissMs={3000} variant="success" />}

      <Dialog open={faviconDeleteOpen} onOpenChange={setFaviconDeleteOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Remove favicon?</DialogTitle>
            <DialogDescription>Your favicon will be removed and the default icon will be shown instead.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaviconDeleteOpen(false)} disabled={faviconBusy}>Cancel</Button>
            <Button variant="destructive" onClick={removeFavicon} disabled={faviconBusy}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}

    </div>
  );
}
