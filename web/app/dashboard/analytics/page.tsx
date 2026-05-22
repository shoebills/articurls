"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUmamiDashboard,
  getSubscription,
  isProSubscription,
  viewsAnalytics,
  listBlogs,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogListItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart2, Loader2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

// ── Legacy free-tier analytics (kept until Step 8) ────────────────────────────

const PERIODS = ["24h", "7d", "28d", "3m", "6m", "1y", "all"] as const;
const PERIOD_OPTIONS: { value: (typeof PERIODS)[number]; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];
const POSTS_PAGE_SIZE = 10;

function LegacyAnalytics({ token }: { token: string }) {
  const [vPeriod, setVPeriod] = useState<(typeof PERIODS)[number]>("28d");
  const [views, setViews] = useState<{
    period: string;
    total_views: number;
    unique_visitors: number;
    total_posts: number;
  } | null>(null);
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [postSort, setPostSort] = useState<"most_viewed" | "latest">("most_viewed");
  const [postPage, setPostPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const [v, postRows] = await Promise.all([
          viewsAnalytics(token, vPeriod),
          listBlogs(token),
        ]);
        if (cancelled) return;
        setViews(v);
        setPosts(postRows.filter((p) => p.status === "published"));
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load analytics");
      }
    })();
    return () => { cancelled = true; };
  }, [token, vPeriod]);

  const comparePublished = (a: BlogListItem, b: BlogListItem) => {
    const aPub = a.published_at;
    const bPub = b.published_at;
    if (aPub && bPub) return new Date(bPub).getTime() - new Date(aPub).getTime();
    if (aPub && !bPub) return -1;
    if (!aPub && bPub) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (postSort === "latest") return comparePublished(a, b);
    const byViews = (b.view_count ?? 0) - (a.view_count ?? 0);
    return byViews !== 0 ? byViews : comparePublished(a, b);
  });

  const postPageCount = Math.max(1, Math.ceil(sortedPosts.length / POSTS_PAGE_SIZE));
  const safePostPage = Math.min(postPage, postPageCount);
  const pagedPosts = sortedPosts.slice(
    (safePostPage - 1) * POSTS_PAGE_SIZE,
    safePostPage * POSTS_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <div className="sm:max-w-xs">
        <Select
          value={vPeriod}
          onValueChange={(v) => setVPeriod(v as (typeof PERIODS)[number])}
        >
          <SelectTrigger className="touch-manipulation" aria-label="Views time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total views</CardDescription>
            <CardTitle className="text-3xl">{views?.total_views ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unique visitors</CardDescription>
            <CardTitle className="text-3xl">{views?.unique_visitors ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total posts</CardDescription>
            <CardTitle className="text-3xl">{views?.total_posts ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Posts</CardTitle>
              <CardDescription>Sort by latest published or most viewed.</CardDescription>
            </div>
            <div className="w-full sm:w-52">
              <Select
                value={postSort}
                onValueChange={(v) => {
                  setPostSort(v as "most_viewed" | "latest");
                  setPostPage(1);
                }}
              >
                <SelectTrigger aria-label="Sort posts list">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_viewed">Most viewed</SelectItem>
                  <SelectItem value="latest">Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pagedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pagedPosts.map((post) => (
                  <li key={post.blog_id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{post.title || "Untitled"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {post.published_at
                            ? `Published ${new Date(post.published_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : "Not published"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {post.view_count ?? 0} view{(post.view_count ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {safePostPage} of {postPageCount}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                    disabled={safePostPage <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPostPage((p) => Math.min(postPageCount, p + 1))}
                    disabled={safePostPage >= postPageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}

// ── Pro Umami iframe dashboard ────────────────────────────────────────────────

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; shareUrl: string }
  | { status: "not_provisioned" }
  | { status: "error"; message: string };

function ProDashboard({ token }: { token: string }) {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUmamiDashboard(token);
        if (!cancelled) setState({ status: "ready", shareUrl: data.share_url });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setState({ status: "not_provisioned" });
        } else {
          setState({
            status: "error",
            message: e instanceof ApiError ? e.message : "Failed to load analytics dashboard",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "not_provisioned") {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BarChart2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold">Dashboard not ready yet</h2>
          <p className="text-sm text-muted-foreground">
            Your analytics website is being set up. This usually takes less than a minute — refresh
            the page to check again.
          </p>
        </div>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <p className="text-sm text-destructive">{state.message}</p>
        </div>
      </Card>
    );
  }

  // Ready — render the Umami share iframe
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <iframe
        src={state.shareUrl}
        title="Analytics dashboard"
        className="h-[700px] w-full"
        loading="lazy"
        // Umami share pages are sandboxed — allow scripts for the dashboard to render
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();

  // null = not checked, true/false = resolved
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    getSubscription(token)
      .then((sub) => setIsPro(isProSubscription(sub)))
      .catch(() => setIsPro(false));
  }, [token]);

  if (isPro === null || !token) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        {isPro && (
          <p className="mt-1 text-sm text-muted-foreground">
            Full visitor analytics for your blog.
          </p>
        )}
      </div>

      {isPro ? (
        <ProDashboard token={token} />
      ) : (
        <div className="space-y-8">
          {/* Upgrade prompt */}
          <Card className="p-8">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BarChart2 className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold">Unlock full analytics with Pro</h2>
                <p className="text-sm text-muted-foreground">
                  Pro gives you a real-time dashboard with page views, unique visitors, referrers,
                  countries, devices, and more — powered by Umami.
                </p>
              </div>
              <Button
                onClick={() => router.push("/dashboard/billing")}
                className="shrink-0"
              >
                Upgrade to Pro
              </Button>
            </div>
          </Card>

          {/* Legacy view counts (kept until Step 8) */}
          <LegacyAnalytics token={token} />
        </div>
      )}
    </div>
  );
}
