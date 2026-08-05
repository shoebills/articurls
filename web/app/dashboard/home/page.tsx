"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  listBlogs,
  getStorageUsage,
  subscribersAnalytics,
  getUmamiOverview,
  ApiError,
  apiCacheHas,
  getCachedApiData,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Plus, ExternalLink, FileText, Users, Eye, HardDrive, ArrowRight, PenLine, Tags, Palette, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlogListItem, StorageUsage, SubscribersAnalytics } from "@/lib/types";
import { UGC_ORIGIN } from "@/lib/env";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

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
    <Card className="rounded-xl border-[#e5e7eb]">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-24" />
        ) : (
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

const quickActions = [
  { href: "/dashboard/posts/new", label: "Write a new post", icon: PenLine },
  { href: "/dashboard/categories", label: "Manage categories", icon: Tags },
  { href: "/dashboard/design", label: "Design your blog", icon: Palette },
  { href: "/dashboard/analytics", label: "View analytics", icon: LineChart },
];

export default function DashboardHomePage() {
  const { token, user } = useAuth();

  const [blogs, setBlogs] = useState<BlogListItem[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<BlogListItem[]>("/blog/", t) ?? [] : [];
  });
  const [storage, setStorage] = useState<StorageUsage | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<StorageUsage>("/user/storage", t) : null;
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
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/blog/", t) &&
      apiCacheHas("/user/storage", t) &&
      apiCacheHas("/analytics/subscribers?period=7d", t)
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
        const [blogsRes, storageRes, subsRes] = await Promise.all([
          listBlogs(token),
          getStorageUsage(token),
          subscribersAnalytics(token, "7d"),
        ]);
        if (cancelled) return;
        setBlogs(blogsRes);
        setStorage(storageRes);
        setSubs(subsRes);
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
  const recentPosts = [...blogs]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Home</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}. Here&apos;s what&apos;s happening with your blog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.user_name ? (
            <Button
              asChild
              variant="outline"
              className="hidden h-11 shrink-0 gap-2 sm:inline-flex"
            >
              <Link href={`${UGC_ORIGIN}/${user.user_name}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Visit blog
              </Link>
            </Button>
          ) : null}
          <Button asChild className="h-11 shrink-0 gap-2 bg-slate-900 text-white hover:bg-slate-800">
            <Link href="/dashboard/posts/new">
              <Plus className="h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Posts"
          value={String(blogs.length)}
          hint={`${publishedCount} published`}
          loading={loading}
        />
        <StatCard
          icon={Eye}
          label="Pageviews (7d)"
          value={views !== null && views !== undefined ? views.toLocaleString() : "—"}
          hint="Umami analytics"
          loading={loading}
        />
        <StatCard
          icon={Users}
          label="Subscribers"
          value={subs ? String(subs.current_subscribers) : "—"}
          hint={subs ? `${subs.subscribed} joined in last 7 days` : undefined}
          loading={loading}
        />
        <StatCard
          icon={HardDrive}
          label="Storage"
          value={storage ? formatBytes(storage.used_bytes) : "—"}
          hint={storage?.is_unlimited ? "Unlimited plan" : storage?.limit_bytes ? `of ${formatBytes(storage.limit_bytes)}` : undefined}
          loading={loading}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
        <Card className="rounded-xl border-[#e5e7eb] lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 sm:p-6">
            <CardTitle className="text-base font-semibold">Recent posts</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/posts">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <ul className="space-y-4 p-5 sm:p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-6 w-3/4" />
                  </li>
                ))}
              </ul>
            ) : recentPosts.length > 0 ? (
              <ul className="divide-y divide-[#e5e7eb]">
                {recentPosts.map((b) => (
                  <li key={b.blog_id}>
                    <Link
                      href={`/dashboard/posts/${b.blog_id}/edit`}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{b.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Updated {timeAgo(b.updated_at)}
                        </p>
                      </div>
                      <BlogStatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm font-medium text-foreground">No posts yet</p>
                  <Button asChild variant="link" size="sm" className="mt-1">
                    <Link href="/dashboard/posts/new">Create your first post</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#e5e7eb]">
          <CardHeader className="p-5 sm:p-6">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ul className="space-y-1 px-2">
              {quickActions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    <action.icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {err ? <FloatingErrorToast message={err} onDismiss={() => setErr(null)} /> : null}
    </div>
  );
}