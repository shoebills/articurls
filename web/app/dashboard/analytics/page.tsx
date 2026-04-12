"use client";

import { useEffect, useState } from "react";
import { viewsAnalytics, subscribersAnalytics, exportSubscribersCsv, ApiError } from "@/lib/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PERIODS = ["24h", "7d", "28d", "3m", "6m", "1y", "all"] as const;

/** Rolling windows used for comparison charts (same keys as the API `period` query). */
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

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [vPeriod, setVPeriod] = useState<(typeof PERIODS)[number]>("28d");
  const [sPeriod, setSPeriod] = useState<(typeof PERIODS)[number]>("28d");
  const [views, setViews] = useState<{ period: string; total_views: number; unique_visitors: number; total_posts: number } | null>(null);
  const [subs, setSubs] = useState<{
    period: string;
    current_subscribers: number;
    subscribed: number;
    unsubscribed: number;
  } | null>(null);
  const [chartViews, setChartViews] = useState<{ name: string; views: number; visitors: number }[]>([]);
  const [chartSubs, setChartSubs] = useState<{ name: string; gained: number; lost: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        const vPeriods = chartPeriodsForSelection(vPeriod);
        const sPeriods = chartPeriodsForSelection(sPeriod);
        const [v, s, viewRows, subRows] = await Promise.all([
          viewsAnalytics(token, vPeriod),
          subscribersAnalytics(token, sPeriod),
          Promise.all(vPeriods.map((p) => viewsAnalytics(token, p))),
          Promise.all(sPeriods.map((p) => subscribersAnalytics(token, p))),
        ]);
        if (cancelled) return;
        setViews(v);
        setSubs(s);
        setChartViews(
          viewRows.map((d, i) => ({
            name: vPeriods[i],
            views: d.total_views,
            visitors: d.unique_visitors,
          }))
        );
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
  }, [token, vPeriod, sPeriod]);

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
    <div className="mx-auto max-w-5xl space-y-10">
      <h1 className="text-2xl font-bold">Analytics</h1>
      {err && <p className="text-sm text-destructive">{err}</p>}

      <Tabs defaultValue="views">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-9 sm:w-auto">
          <TabsTrigger value="views" className="min-h-11 sm:min-h-8">
            Views
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="min-h-11 sm:min-h-8">
            Subscribers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="views" className="space-y-6">
          <div className="sm:max-w-xs">
            <Select value={vPeriod} onValueChange={(v) => setVPeriod(v as (typeof PERIODS)[number])}>
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
            <CardHeader>
              <CardTitle>Views by window</CardTitle>
              <CardDescription>
                Each point is total views and unique visitors for that rolling window. The chart includes every window
                length up to the range you selected.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartViews} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="linear"
                    dataKey="views"
                    name="Views"
                    stroke="oklch(0.5 0.2 260)"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="linear"
                    dataKey="visitors"
                    name="Unique visitors"
                    stroke="oklch(0.55 0.14 200)"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6">
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
            <Button variant="outline" className="h-11 w-full shrink-0 touch-manipulation sm:h-auto sm:w-auto sm:min-h-9" onClick={exportCsv}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
