"use client";

import { useEffect, useState } from "react";
import { subscribersAnalytics, ApiError, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelect } from "@/components/dashboard/period-select";
import { chartTickInterval } from "@/lib/periods";
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
import { DashboardBreadcrumb } from "@/components/settings-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Format a bucket key (wall-clock in the site's timezone) as a chart label:
 *   hour -> "2026-05-22T14"   day -> "2026-05-22"   month -> "2026-05"
 */
function seriesLabelFormatter(value: string, unit?: string, longMonthNames = false): string {
  if (unit === "hour") {
    const hour = value.slice(11, 13);
    return hour ? `${hour}:00` : value;
  }
  if (unit === "month") {
    const year = value.slice(0, 4);
    const month = value.slice(5, 7);
    if (!year || !month) return value;
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const name = names[Number(month) - 1] || month;
    return longMonthNames ? `${name} '${year.slice(2)}` : name;
  }
  try {
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return value.slice(0, 10);
  }
}

export function SubscribersAnalyticsPanel() {
  const { token, loading: authLoading } = useAuth();
  const [sPeriod, setSPeriod] = useState<string>("7d");
  const [unit, setUnit] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const t = localStorage.getItem("articurls_token");
    if (!t) return undefined;
    const cached = getCachedApiData<SubscribersAnalytics>("/analytics/subscribers?period=7d", t);
    return cached?.unit;
  });
  const [chartSubs, setChartSubs] = useState<{ x: string; gained: number }[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    if (!t) return [];
    const cached = getCachedApiData<SubscribersAnalytics>("/analytics/subscribers?period=7d", t);
    return cached?.series.map((p) => ({
      x: p.x,
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
        setUnit(data.unit);
        setChartSubs(
          data.series.map((p) => ({
            x: p.x,
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
        <DashboardBreadcrumb
          trail={[{ label: "Dashboard", href: "/dashboard" }, { label: "Subscribers" }]}
        />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>
          <div className="w-auto shrink-0">
            <PeriodSelect
              value={sPeriod}
              onChange={(v) => setSPeriod(v)}
              triggerClassName="h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto"
            />
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
                      dataKey="x"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => seriesLabelFormatter(String(v), unit, chartSubs.length > 12)}
                      tickLine={false}
                      axisLine={false}
                      interval={chartTickInterval(unit, chartSubs.length)}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip
                      labelFormatter={(label) => seriesLabelFormatter(String(label), unit, chartSubs.length > 12)}
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
