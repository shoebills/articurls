"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { exchangeOAuthCode, consumePendingCheckout } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  listBlogs,
  listSubscribers,
  getAccountUsage,
  updateSiteOnboarding,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { cn } from "@/lib/utils";
import { UGC_DOMAIN } from "@/lib/env";
import {
  FileText,
  ArrowRight,
  PenLine,
  Mail,
  ChevronRight,
  Check,
} from "lucide-react";
import type { BlogListItem, AccountUsage, RecentSubscriber, SubscriberListResponse } from "@/lib/types";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, activeSite, refreshSites } = useAuth();
  const exchangedOAuth = useRef(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const [blogs, setBlogs] = useState<BlogListItem[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<BlogListItem[]>("/blog/", t) ?? [] : [];
  });
  const [recentSubscribers, setRecentSubscribers] = useState<RecentSubscriber[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<SubscriberListResponse>("/list?page=1&limit=5", t)?.items ?? [] : [];
  });
  const [usage, setUsage] = useState<AccountUsage | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<AccountUsage>("/billing/usage", t) : null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/blog/", t) &&
      apiCacheHas("/billing/usage", t)
    );
  });
  const [err, setErr] = useState<string | null>(null);
  const [dismissingChecklist, setDismissingChecklist] = useState(false);
  const [dismissedSiteIds, setDismissedSiteIds] = useState<Set<string>>(() => new Set());
  const [themeVisited, setThemeVisited] = useState(false);

  useEffect(() => {
    if (!activeSite?.site_id) return;
    const tv = localStorage.getItem(`articurls_theme_onboarded_${activeSite.site_id}`) === "true";
    setThemeVisited(tv);
  }, [activeSite?.site_id]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [blogsRes, usageRes, recentSubsRes] = await Promise.all([
          listBlogs(token).catch(() => [] as BlogListItem[]),
          getAccountUsage(token).catch(() => null),
          listSubscribers(token, 1, 5).catch(() => null),
        ]);
        if (cancelled) return;
        setBlogs(blogsRes);
        setUsage(usageRes);
        if (recentSubsRes?.items) {
          setRecentSubscribers(recentSubsRes.items);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (exchangedOAuth.current) return;
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get("code");

    if (oauthCode) {
      exchangedOAuth.current = true;
      setOauthBusy(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      exchangeOAuthCode(oauthCode).then(() => {
        const target = consumePendingCheckout();
        if (target === "/dashboard") {
          window.location.reload();
        } else {
          window.location.replace(target);
        }
      }).catch(() => {
        router.replace("/login?error=oauth_failed");
      });
    }
  }, [router]);

  if (oauthBusy) return null;

  const isDismissed = activeSite ? dismissedSiteIds.has(String(activeSite.site_id)) : false;
  const isNew = activeSite ? (!activeSite.onboarding_completed && !isDismissed) : false;
  const publishedCount = blogs.filter((b) => b.status === "published").length;

  async function handleDismissChecklist() {
    if (!token || !activeSite) return;
    const currentSiteId = String(activeSite.site_id);
    setDismissingChecklist(true);
    setDismissedSiteIds((prev) => new Set(prev).add(currentSiteId));
    try {
      await updateSiteOnboarding(token, currentSiteId, true);
      await refreshSites();
    } catch (e) {
      setDismissedSiteIds((prev) => {
        const next = new Set(prev);
        next.delete(currentSiteId);
        return next;
      });
      setErr(e instanceof ApiError ? e.message : "Failed to update checklist status");
    } finally {
      setDismissingChecklist(false);
    }
  }

  function handleCustomizeTheme() {
    if (activeSite?.site_id) {
      localStorage.setItem(`articurls_theme_onboarded_${activeSite.site_id}`, "true");
      setThemeVisited(true);
    }
  }

  const hasCustomDomain = Boolean(
    activeSite?.custom_domain &&
    (activeSite.domain_status === "active" || activeSite.domain_status === "grace")
  );

  const checklistSteps = [
    {
      id: "identity",
      title: "Publication created & identity set",
      description: activeSite ? `Live on ${activeSite.subdomain}.${UGC_DOMAIN} with default identity.` : "Publication created and default identity set.",
      href: "/dashboard/settings/general",
      actionLabel: "Configure",
      completed: true,
      onAction: undefined,
    },
    {
      id: "theme",
      title: "Choose your theme & typography",
      description: "Select your preferred color mode, palette, and typography pairing.",
      href: "/dashboard/themes",
      actionLabel: "Customize",
      completed: themeVisited,
      onAction: handleCustomizeTheme,
    },
    {
      id: "post",
      title: "Write and publish an article",
      description: "Draft your article, format your content, and publish to the web.",
      href: "/dashboard/posts/new",
      actionLabel: "Write Post",
      completed: publishedCount > 0,
      onAction: undefined,
    },
    {
      id: "domain",
      title: "Connect a custom domain",
      description: "Point your custom domain name to your publication.",
      href: "/dashboard/settings/domains",
      actionLabel: "Configure",
      completed: hasCustomDomain,
      onAction: undefined,
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / checklistSteps.length) * 100);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Header with FOUC protection */}
      {loading && !activeSite ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
      ) : isNew ? (
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Get Started
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete these steps to launch your publication.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
        </div>
      )}

      {/* Onboarding Checklist Card (when new) */}
      {isNew ? (
        <Card className="rounded-2xl border border-border/70 bg-card shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 pb-4 sm:pb-4 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Launch Checklist
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  Complete these steps to get your publication ready for readers.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {completedCount} of {checklistSteps.length} completed
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissChecklist}
                  disabled={dismissingChecklist}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  {dismissingChecklist ? "Dismissing..." : "Dismiss"}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>

            {/* 100% Celebration Banner */}
            {completedCount === checklistSteps.length ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <span className="text-base">🎉</span>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  All steps complete! Your publication is ready for readers.
                </p>
              </div>
            ) : null}
          </div>

          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {checklistSteps.map((step, idx) => (
                <li
                  key={step.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors mt-0.5 sm:mt-0",
                        step.completed
                          ? "bg-primary/10 text-primary"
                          : "border border-border text-muted-foreground bg-muted/30"
                      )}
                    >
                      {step.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold tracking-tight leading-snug",
                          step.completed ? "text-foreground line-through opacity-70" : "text-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant={step.completed ? "ghost" : "outline"}
                    size="sm"
                    onClick={step.onAction}
                    className="h-8 shrink-0 text-xs font-semibold self-start sm:self-auto gap-1"
                  >
                    <Link href={step.href}>
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Traffic & Account Usage (Full Width) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Traffic & Account Usage
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Aggregate monthly pageview traffic combined across all your owned sites.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 w-fit shrink-0 gap-1.5 text-xs font-semibold">
            <Link href="/dashboard/billing">
              Manage Plan
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {loading && !usage ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-5">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ) : usage ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {usage.total_pageviews.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm font-medium">
                  {" "}
                  {usage.tier_limit !== null
                    ? `/ ${usage.tier_limit.toLocaleString()} monthly views`
                    : "monthly views (Unlimited)"}
                </span>
              </div>
              <div className="text-right">
                {usage.tier_limit !== null ? (
                  <>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {usage.usage_percentage ?? 0}%
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      capacity used
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold tabular-nums text-emerald-600">
                      Unlimited
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      no traffic limit
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {usage.tier_limit !== null && usage.usage_percentage !== null ? (
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    usage.usage_percentage > 90
                      ? "bg-destructive"
                      : usage.usage_percentage > 75
                        ? "bg-amber-500"
                        : "bg-primary"
                  )}
                  style={{ width: `${Math.max(2, Math.min(100, usage.usage_percentage))}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
            Traffic analytics unavailable for this cycle.
          </div>
        )}
      </section>

      {/* Recent Posts & Recent Subscribers Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <Card className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card shadow-2xs">
          <div>
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-3 sm:pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Recent Posts
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Latest articles on this site
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <Link href="/dashboard/posts">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {loading && blogs.length === 0 ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : blogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <FileText className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No posts yet</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Start writing to publish your first article on this site.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-4 h-8 gap-1.5 text-xs font-semibold">
                    <Link href="/dashboard/posts/new">
                      <PenLine className="h-3.5 w-3.5" />
                      Write Post
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {blogs.slice(0, 5).map((post) => (
                    <li key={post.blog_id}>
                      <Link
                        href={`/dashboard/posts/${post.blog_id}/edit`}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50 group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {post.title || "Untitled"}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(post.published_at || post.created_at)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Recent Subscribers */}
        <Card className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card shadow-2xs">
          <div>
            <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 pb-3 sm:pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Recent Subscribers
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Latest audience members
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <Link href="/dashboard/audience">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {loading && recentSubscribers.length === 0 ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : recentSubscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <Mail className="h-5 w-5 opacity-70" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No subscribers yet</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                    Readers who subscribe to your blog will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {recentSubscribers.slice(0, 5).map((sub) => (
                    <li key={sub.email}>
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {sub.email}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Joined {formatDate(sub.subscribed_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {err ? <FloatingErrorToast message={err} onDismiss={() => setErr(null)} /> : null}
    </div>
  );
}
