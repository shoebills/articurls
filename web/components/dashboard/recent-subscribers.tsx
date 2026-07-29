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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Subscribed</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2.5"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Subscribed</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr key={sub.email} className="border-b last:border-0">
                      <td className="px-3 py-2.5 text-sm truncate max-w-0">{sub.email}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(sub.subscribed_at)}
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge sub={sub} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
