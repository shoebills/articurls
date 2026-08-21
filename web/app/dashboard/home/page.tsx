"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  listBlogs,
  subscribersAnalytics,
  getUmamiOverview,
  getAccountUsage,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import {
  FileText,
  Users,
  Eye,
  Globe,
  ArrowRight,
  PenLine,
  Tags,
  Palette,
  LineChart,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlogListItem, SubscribersAnalytics, AccountUsage } from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  loading: boolean;
}) {
  return (
    <Card className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground truncate">{hint}</p>
        ) : (
          <div className="mt-1 h-4" />
        )}
      </div>
    </Card>
  );
}

const quickActions = [
  { href: "/dashboard/posts/new", label: "Write a new post", icon: PenLine },
  { href: "/dashboard/categories", label: "Manage categories", icon: Tags },
  { href: "/dashboard/themes", label: "Customize themes", icon: Palette },
  { href: "/dashboard/analytics", label: "View analytics", icon: LineChart },
];

export default function DashboardHomePage() {
  const { token, user } = useAuth();

  const [blogs, setBlogs] = useState<BlogListItem[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<BlogListItem[]>("/blog/", t) ?? [] : [];
  });
  const [subs, setSubs] = useState<SubscribersAnalytics | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<SubscribersAnalytics>("/analytics/subscribers?period=7d", t) : null;
  });
  const [views, setViews] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<{ overview: { pageviews: number } }>("/analytics/umami/overview?period=7d", t) : null;
    return cached?.overview?.pageviews ?? null;
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
      apiCacheHas("/analytics/subscribers?period=7d", t) &&
      apiCacheHas("/billing/usage", t)
    );
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [blogsRes, subsRes, usageRes] = await Promise.all([
          listBlogs(token).catch(() => [] as BlogListItem[]),
          subscribersAnalytics(token, "7d").catch(() => null),
          getAccountUsage(token).catch(() => null),
        ]);
        if (cancelled) return;
        setBlogs(blogsRes);
        setSubs(subsRes);
        setUsage(usageRes);
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
    if (!token) return;
    let cancelled = false;
    getUmamiOverview(token, "7d")
      .then((data) => {
        if (!cancelled) setViews(data.overview?.pageviews ?? null);
      })
      .catch(() => {
        if (!cancelled) setViews(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const publishedCount = blogs.filter((b) => b.status === "published").length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user?.name ? user.name.split(" ")[0] : "Abhishek"}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your active site and overall traffic.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Posts"
          value={String(blogs.length)}
          hint={`${publishedCount} published`}
          loading={loading}
        />
        <StatCard
          icon={Eye}
          label="Pageviews"
          value={views !== null && views !== undefined ? views.toLocaleString() : "—"}
          hint="Last 7 days"
          loading={loading}
        />
        <StatCard
          icon={Users}
          label="Subscribers"
          value={subs ? String(subs.current_subscribers) : "—"}
          hint={subs ? "Last 7 days" : undefined}
          loading={loading}
        />
        <StatCard
          icon={Globe}
          label="Sites"
          value={usage ? String(usage.sites.length) : "—"}
          hint={usage ? `${usage.sites.length === 1 ? "Active site" : "Active sites"}` : undefined}
          loading={loading}
        />
      </div>

      {/* Main Section: Usage Meter & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Modern Usage & Views Meter (2 Columns) */}
        <Card className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card lg:col-span-2 shadow-2xs">
          <div>
            <CardHeader className="p-5 sm:p-6 pb-4 sm:pb-4 border-b border-border/40">
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Traffic & Account Usage</CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Aggregate monthly pageview traffic combined across all your owned sites.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-6">
              {loading && !usage ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-3 w-full rounded-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                </div>
              ) : usage ? (
                <>
                  {/* Visual Views Meter Bar */}
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                          {usage.total_pageviews.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">
                          {" "}
                          / {usage.tier_limit.toLocaleString()} monthly views
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {usage.usage_percentage}%
                        </span>
                        <span className="text-[11px] text-muted-foreground block">
                          capacity used
                        </span>
                      </div>
                    </div>

                    {/* Modern Progress Bar */}
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          usage.usage_percentage > 90
                            ? "bg-destructive"
                            : usage.usage_percentage > 75
                              ? "bg-amber-500"
                              : "bg-primary"
                        }`}
                        style={{ width: `${Math.max(2, Math.min(100, usage.usage_percentage))}%` }}
                      />
                    </div>
                  </div>

                  <Button asChild variant="outline" size="sm" className="h-8 w-full justify-center gap-1.5 text-xs font-semibold">
                    <Link href="/dashboard/billing">
                      Manage Plan
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>

                  {/* Per-Site Breakdown */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Site Traffic Breakdown ({usage.sites.length})
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Plan: <span className="font-semibold text-foreground uppercase">{usage.plan_type}</span>
                      </span>
                    </div>

                    {usage.sites.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                        No site traffic recorded yet in this cycle.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {usage.sites.map((site) => {
                          const sitePct =
                            usage.total_pageviews > 0
                              ? Math.round((site.pageviews / usage.total_pageviews) * 100)
                              : 0;
                          return (
                            <div
                              key={site.site_id}
                              className="flex flex-col justify-between rounded-xl border border-border/70 bg-muted/15 p-3.5 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-semibold text-xs text-foreground truncate">
                                    {site.nav_blog_name || site.subdomain}
                                  </span>
                                </div>
                                <span className="text-xs font-bold tabular-nums text-foreground shrink-0">
                                  {site.pageviews.toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="truncate max-w-[130px]">{site.subdomain}.articurls.site</span>
                                <span className="tabular-nums font-medium">{sitePct}% of total</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
                  Traffic analytics unavailable for this cycle.
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Quick Actions Card (1 Column) */}
        <Card className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card shadow-2xs">
          <div>
            <CardHeader className="p-5 sm:p-6 pb-3 sm:pb-3 border-b border-border/40">
              <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <ul className="space-y-1">
                {quickActions.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-primary/10 transition-colors">
                        <action.icon className="h-4 w-4 shrink-0" />
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">{action.label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Need help?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Reach out to platform support</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold">
                <Link href="/dashboard/support">Support →</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {err ? <FloatingErrorToast message={err} onDismiss={() => setErr(null)} /> : null}
    </div>
  );
}