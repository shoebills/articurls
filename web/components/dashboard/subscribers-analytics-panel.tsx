"use client";

import { useEffect, useState } from "react";
import { subscribersAnalytics, exportSubscribersCsv, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Legend,
} from "recharts";
import type { SubscribersAnalytics } from "@/lib/types";
import { FloatingErrorToast } from "@/components/floating-error-toast";

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

function seriesLabelFormatter(value: string, period: (typeof PERIODS)[number], tz?: string): string {
  try {
    const date = new Date(value);
    if (period === "24h") {
      return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    }
    if (period === "7d" || period === "28d") {
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString(undefined, { month: "short", year: period === "all" ? "numeric" : "2-digit" });
  } catch {
    if (period === "24h") return value.slice(11, 16);
    return value.slice(0, 10);
  }
}

export function SubscribersAnalyticsPanel() {
  const { token } = useAuth();
  const [sPeriod, setSPeriod] = useState<(typeof PERIODS)[number]>("28d");
  const [subs, setSubs] = useState<SubscribersAnalytics | null>(null);
  const [chartSubs, setChartSubs] = useState<{ timestamp: string; gained: number; lost: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const data = await subscribersAnalytics(token, sPeriod);
        if (cancelled) return;
        setSubs(data);
        setChartSubs(
          data.series.map((p) => ({
            timestamp: p.timestamp,
            gained: p.subscribed,
            lost: p.unsubscribed,
          }))
        );
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Failed to load analytics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sPeriod]);

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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Select value={sPeriod} onValueChange={(v) => setSPeriod(v as (typeof PERIODS)[number])}>
              <SelectTrigger className="touch-manipulation" aria-label="Subscribers time range">
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
          <Button
            variant="outline"
            className="h-11 w-full shrink-0 touch-manipulation sm:h-auto sm:w-auto sm:min-h-9"
            onClick={exportCsv}
          >
            Export CSV
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Current subscribers</CardDescription>
              <CardTitle className="text-3xl">{subs?.current_subscribers ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>New subscribers</CardDescription>
              <CardTitle className="text-3xl">{subs?.subscribed ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unsubscribes</CardDescription>
              <CardTitle className="text-3xl">{subs?.unsubscribed ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card>
          <CardHeader className="px-4 pb-6 pt-4 sm:p-9 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Subscribers trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">New subscribers and unsubscribes over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-56 px-2 pt-0 sm:h-64 sm:p-9 sm:pt-0 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSubs} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="colorSubscribed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUnsubscribed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.2 25)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.55 0.2 25)" stopOpacity={0} />
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
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: "8px" }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="gained"
                  name="Subscribed"
                  stroke="oklch(0.6 0.15 145)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSubscribed)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="lost"
                  name="Unsubscribed"
                  stroke="oklch(0.55 0.2 25)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorUnsubscribed)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
