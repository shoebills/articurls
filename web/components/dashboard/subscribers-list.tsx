"use client";

import { useEffect, useState } from "react";
import { listSubscribers, exportSubscribersCsv, ApiError, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2 } from "lucide-react";
import type { SubscriberListResponse } from "@/lib/types";

const SUBSCRIBERS_PER_PAGE = 10;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SubscriberList() {
  const { token, loading: authLoading } = useAuth();
  const [subscribers, setSubscribers] = useState<SubscriberListResponse["items"]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<SubscriberListResponse>(`/list?page=1&limit=${SUBSCRIBERS_PER_PAGE}`, t)?.items ?? [] : [];
  });
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas(`/list?page=1&limit=${SUBSCRIBERS_PER_PAGE}`, t);
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await listSubscribers(token, page, SUBSCRIBERS_PER_PAGE);
        if (cancelled) return;
        setSubscribers(data.items);
        setTotalPages(data.total_pages);
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load subscribers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, page]);

  async function exportCsv() {
    if (!token) return;
    try {
      const blob = await exportSubscribersCsv(token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "subscribers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Export failed");
    }
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Subscribers list</h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Emails collected through your site&apos;s newsletter form, newest first.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-9 w-auto shrink-0 touch-manipulation"
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>
        <div>
          {authLoading || loading ? (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="w-1/2 px-3 py-2 font-medium">Email</th>
                    <th className="w-1/2 px-3 py-2 font-medium">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2.5"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-3 py-2.5"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dotted border-border bg-background px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60">
                <Users2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No subscribers yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Share your blog to start building your audience
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="w-1/2 px-3 py-2 font-medium">Email</th>
                      <th className="w-1/2 px-3 py-2 font-medium">Subscribed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => (
                      <tr key={sub.email} className="border-b last:border-0">
                        <td className="px-3 py-2.5 text-sm truncate">{sub.email}</td>
                        <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(sub.subscribed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <Button variant="outline" size="sm" className="h-8 min-h-0 px-3 py-1.5" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Page {page} of {totalPages}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-h-0 px-3 py-1.5"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
