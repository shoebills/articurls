"use client";

import { useEffect, useState } from "react";
import { getRecentSubscribers, ApiError, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2 } from "lucide-react";
import type { RecentSubscriber } from "@/lib/types";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ sub }: { sub: RecentSubscriber }) {
  if (sub.unsubscribed_at) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
        Unsubscribed
      </span>
    );
  }
  if (!sub.is_confirmed) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
        Pending
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      Active
    </span>
  );
}

export function RecentSubscribers() {
  const { token, loading: authLoading } = useAuth();
  const [subscribers, setSubscribers] = useState<RecentSubscriber[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<RecentSubscriber[]>("/recent", t) ?? [] : [];
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/recent", t);
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getRecentSubscribers(token);
        if (cancelled) return;
        setSubscribers(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load recent subscribers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <Card>
        <CardHeader className="px-4 pb-4 pt-4 sm:px-6 sm:pt-6 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Recent subscribers</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          {authLoading || loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm ring-1 ring-border/60">
                <Users2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No subscribers yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Share your blog to start building your audience
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscribers.map((sub) => (
                <div
                  key={sub.email}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="truncate text-sm font-medium min-w-0">{sub.email}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(sub.subscribed_at)}
                    </span>
                  </div>
                  <StatusBadge sub={sub} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
