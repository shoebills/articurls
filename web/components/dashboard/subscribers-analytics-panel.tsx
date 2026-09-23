"use client";

import { useEffect, useState } from "react";
import { subscribersAnalytics, ApiError, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SubscribersAnalytics } from "@/lib/types";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";
const PERIODS = ["24h", "7d", "this_month", "last_month", "this_year", "1y", "all"] as const;

const PERIOD_OPTIONS: { value: (typeof PERIODS)[number]; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

function seriesLabelFormatter(value: string, period: (typeof PERIODS)[number], tz?: string): string {
  try {
    const date = new Date(value);
    if (period === "24h") {
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    }
    if (period === "7d" || period === "this_month" || period === "last_month") {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    if (period === "all") {
      return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short" });
  } catch {
    if (period === "24h") return value.slice(11, 16);
    if (period === "7d" || period === "this_month" || period === "last_month") return value.slice(0, 10);
    return value.slice(0, 7);
  }
}

export function SubscribersAnalyticsPanel() {
  const { token, loading: authLoading } = useAuth();
  const [sPeriod, setSPeriod] = useState<(typeof PERIODS)[number]>("7d");
  const [chartSubs, setChartSubs] = useState<{ timestamp: string; gained: number }[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    if (!t) return [];
    const cached = getCachedApiData<SubscribersAnalytics>("/analytics/subscribers?period=7d", t);
    return cached?.series.map((p) => ({
      timestamp: p.timestamp,
      gained: p.subscribed,
    })) ?? [];
  });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/analytics/subscribers?period=7d", t);
  });

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const totalGained = chartSubs.reduce((sum, p) => sum + p.gained, 0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await subscribersAnalytics(token, sPeriod);
        if (cancelled) return;
        setChartSubs(
          data.series.map((p) => ({
            timestamp: p.timestamp,
            gained: p.subscribed,
          }))
        );
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sPeriod]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>
          <div className="w-auto shrink-0">
            <Select value={sPeriod} onValueChange={(v) => setSPeriod(v as (typeof PERIODS)[number])}>
              <SelectTrigger className="h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto" aria-label="Subscribers time range">
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
        </div>

        {authLoading || loading ? (
          <Card>
            <CardHeader className="px-4 pb-6 pt-4 sm:p-9 sm:pb-6">
              <Skeleton className="h-5 w-40 sm:h-6 sm:w-48" />
              <Skeleton className="h-3 w-64 sm:h-4 sm:w-72 mt-2" />
            </CardHeader>
            <CardContent className="h-56 px-2 pt-0 sm:h-64 sm:p-9 sm:pt-0 lg:h-80">
              <Skeleton className="h-full w-full rounded-md" />
            </CardContent>
          </Card>
        ) : (
          <Card>
              <CardHeader className="px-4 pb-6 pt-4 sm:p-9 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">
                  Subscribers gained{" "}
                  <span className="font-normal text-muted-foreground">+{totalGained}</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">New subscribers over time.</CardDescription>
              </CardHeader>
              <CardContent className="h-56 px-2 pt-0 sm:h-64 sm:p-9 sm:pt-0 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartSubs} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="colorGained" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                      vertical={false}
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => seriesLabelFormatter(v, sPeriod, userTz)}
                      tickLine={false}
                      axisLine={false}
                      interval={chartSubs.length > 10 ? "preserveStartEnd" : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      labelFormatter={(label) => seriesLabelFormatter(String(label), sPeriod, userTz)}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: "10px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--background))",
                        boxShadow: "0 10px 25px -5px hsl(var(--shadow) / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gained"
                      name="Subscribed"
                      stroke="oklch(0.6 0.15 145)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGained)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
        )}
      </div>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}