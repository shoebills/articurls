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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const PERIODS = ["24h", "7d", "28d", "3m", "6m", "1y", "all"] as const;

const CHART_PERIOD_ORDER = ["24h", "7d", "28d", "3m", "6m", "1y"] as const;

function chartPeriodsForSelection(selected: (typeof PERIODS)[number]): (typeof CHART_PERIOD_ORDER)[number][] {
  if (selected === "all") return [...CHART_PERIOD_ORDER];
  const idx = CHART_PERIOD_ORDER.indexOf(selected as (typeof CHART_PERIOD_ORDER)[number]);
  if (idx === -1) return [...CHART_PERIOD_ORDER];
  return CHART_PERIOD_ORDER.slice(0, idx + 1) as (typeof CHART_PERIOD_ORDER)[number][];
}

const PERIOD_OPTIONS: { value: (typeof PERIODS)[number]; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

export function SubscribersAnalyticsPanel() {
  const { token } = useAuth();
  const [sPeriod, setSPeriod] = useState<(typeof PERIODS)[number]>("28d");
  const [subs, setSubs] = useState<{
    period: string;
    current_subscribers: number;
    subscribed: number;
    unsubscribed: number;
  } | null>(null);
  const [chartSubs, setChartSubs] = useState<{ name: string; gained: number; lost: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const sPeriods = chartPeriodsForSelection(sPeriod);
        const [s, subRows] = await Promise.all([
          subscribersAnalytics(token, sPeriod),
          Promise.all(sPeriods.map((p) => subscribersAnalytics(token, p))),
        ]);
        if (cancelled) return;
        setSubs(s);
        setChartSubs(
          subRows.map((d, i) => ({
            name: sPeriods[i],
            gained: d.subscribed,
            lost: d.unsubscribed,
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
              <CardDescription>New (period)</CardDescription>
              <CardTitle className="text-3xl">{subs?.subscribed ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unsubscribes (period)</CardDescription>
              <CardTitle className="text-3xl">{subs?.unsubscribed ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Subscribers by window</CardTitle>
            <CardDescription>
              New subscriptions and unsubscribes counted within each rolling window, for every window length up to your
              selected range.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartSubs} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="linear"
                  dataKey="gained"
                  name="Subscribed"
                  stroke="oklch(0.5 0.16 145)"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="linear"
                  dataKey="lost"
                  name="Unsubscribed"
                  stroke="oklch(0.55 0.2 25)"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
