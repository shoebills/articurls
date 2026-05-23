"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSubscription,
  isProSubscription,
  ApiError,
  AnalyticsPeriod,
  getUmamiOverview,
  getUmamiTimeseries,
  getUmamiPages,
  getUmamiSources,
  getUmamiGeo,
  getUmamiTech,
  getUmamiRealtime,
  UmamiOverviewResponse,
  UmamiTimeseriesResponse,
  UmamiPagesResponse,
  UmamiSourcesResponse,
  UmamiGeoResponse,
  UmamiTechResponse,
  UmamiRealtimeResponse,
  UmamiMetricsRow,
  UmamiTimeseriesItem,
} from "@/lib/api";
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
  BarChart2,
  Users,
  Eye,
  Loader2,
  Activity,
  Smartphone,
  Laptop,
  Monitor as MonitorIcon,
  Layout,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

const COLORS = [
  "oklch(0.6 0.15 145)",
  "oklch(0.55 0.2 25)",
  "oklch(0.58 0.18 280)",
  "oklch(0.62 0.16 30)",
  "oklch(0.56 0.17 200)",
];

function RealtimePanel({ token }: { token: string }) {
  const [data, setData] = useState<UmamiRealtimeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getUmamiRealtime(token);
        if (!cancelled) setData(d);
      } catch {
        // ignore errors for realtime, just stay null
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-900 dark:text-emerald-100">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
            <Skeleton className="h-5 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <Skeleton className="h-10 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-emerald-900 dark:text-emerald-100">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
          Real-time
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        {data ? (
          <div className="space-y-3">
            <div className="text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
              {data.active_visitors}
            </div>
            <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-200/80">
              Active visitors right now
            </p>
            {Object.keys(data.urls).length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-emerald-900/70 dark:text-emerald-300/70 mb-2">
                  Top pages
                </p>
                <ul className="text-xs sm:text-sm space-y-1">
                  {Object.entries(data.urls as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([url, count]) => (
                      <li key={url} className="flex justify-between text-emerald-900/80 dark:text-emerald-200/80">
                        <span className="truncate max-w-[180px] sm:max-w-[200px]">{url}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
              0
            </div>
            <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-200/80">
              Active visitors right now
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          {title}
        </CardDescription>
        <CardTitle className="text-2xl sm:text-3xl lg:text-4xl">{value}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-7 w-24 mt-2" />
      </CardHeader>
    </Card>
  );
}

function NativeAnalytics({ token }: { token: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [overview, setOverview] = useState<UmamiOverviewResponse | null>(null);
  const [timeseries, setTimeseries] = useState<UmamiTimeseriesResponse | null>(null);
  const [pages, setPages] = useState<UmamiPagesResponse | null>(null);
  const [sources, setSources] = useState<UmamiSourcesResponse | null>(null);
  const [geo, setGeo] = useState<UmamiGeoResponse | null>(null);
  const [tech, setTech] = useState<UmamiTechResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [o, t, p, s, g, te] = await Promise.all([
          getUmamiOverview(token, period),
          getUmamiTimeseries(token, period),
          getUmamiPages(token, period),
          getUmamiSources(token, period),
          getUmamiGeo(token, period),
          getUmamiTech(token, period),
        ]);
        if (!cancelled) {
          setOverview(o);
          setTimeseries(t);
          setPages(p);
          setSources(s);
          setGeo(g);
          setTech(te);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof ApiError ? e.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, period]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Full visitor analytics for your blog.
          </p>
        </div>
        <div className="w-full sm:w-auto sm:max-w-xs">
          <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <SelectTrigger className="touch-manipulation h-11 sm:h-auto" aria-label="Analytics time range">
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

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
          <Skeleton className="h-56 sm:h-72 w-full rounded-lg border" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex overflow-x-auto touch-pan-x">
            <TabsTrigger value="overview" className="flex-1 sm:flex-none text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="pages" className="flex-1 sm:flex-none text-xs sm:text-sm">Pages</TabsTrigger>
            <TabsTrigger value="sources" className="flex-1 sm:flex-none text-xs sm:text-sm">Sources</TabsTrigger>
            <TabsTrigger value="geo" className="hidden sm:flex text-xs sm:text-sm">Geo</TabsTrigger>
            <TabsTrigger value="tech" className="hidden sm:flex text-xs sm:text-sm">Tech</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <div className="col-span-2 lg:col-span-1">
                <RealtimePanel token={token} />
              </div>
              <KpiCard
                title="Pageviews"
                value={overview?.overview.pageviews ?? "—"}
                icon={Eye}
              />
              <KpiCard
                title="Visitors"
                value={overview?.overview.visitors ?? "—"}
                icon={Users}
              />
              <KpiCard
                title="Visits"
                value={overview?.overview.visits ?? "—"}
                icon={Layout}
              />
            </div>

            {timeseries && (timeseries.pageviews.length > 0 || timeseries.visitors.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Traffic</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Pageviews and visitors over time.</CardDescription>
                </CardHeader>
                <CardContent className="h-48 sm:h-64 lg:h-80 pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeseries.pageviews.map((p: UmamiTimeseriesItem, i: number) => ({
                      x: p.x,
                      pageviews: p.y,
                      visitors: timeseries.visitors[i]?.y ?? 0,
                    }))}
                    margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.58 0.18 280)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="oklch(0.58 0.18 280)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area
                        type="monotone"
                        dataKey="pageviews"
                        name="Pageviews"
                        stroke="oklch(0.6 0.15 145)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPageviews)"
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        name="Visitors"
                        stroke="oklch(0.58 0.18 280)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorVisitors)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {pages && pages.rows.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Top pages</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48 sm:h-64 pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pages.rows.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="x" type="category" tick={{ fontSize: 9 }} width={100} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="y" name="Visitors" fill="oklch(0.6 0.15 145)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {sources && sources.referrers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Referrers</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48 sm:h-64 pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sources.referrers.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="x" type="category" tick={{ fontSize: 9 }} width={100} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="y" name="Visitors" fill="oklch(0.58 0.18 280)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pages">
            {pages && pages.rows.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">All pages</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 sm:space-y-2">
                    {pages.rows.map((row: UmamiMetricsRow, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <span className="truncate max-w-[220px] sm:max-w-[300px] text-xs sm:text-sm">
                          {row.x}
                        </span>
                        <span className="font-medium text-xs sm:text-sm">
                          {row.y}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">No page data yet</CardTitle>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sources">
            {sources && sources.referrers.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">All referrers</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 sm:space-y-2">
                    {sources.referrers.map((row: UmamiMetricsRow, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <span className="truncate max-w-[220px] sm:max-w-[300px] text-xs sm:text-sm">
                          {row.x}
                        </span>
                        <span className="font-medium text-xs sm:text-sm">
                          {row.y}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">No referrer data yet</CardTitle>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="geo">
            {geo && geo.countries.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Countries</CardTitle>
                  </CardHeader>
                  <CardContent className="h-48 sm:h-64 pt-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={geo.countries.slice(0, 10)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ x }) => `${x}`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="y"
                        >
                          {geo.countries.slice(0, 10).map((_: UmamiMetricsRow, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">All countries</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 sm:space-y-2">
                      {geo.countries.map((row: UmamiMetricsRow, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <span className="text-xs sm:text-sm">
                            {row.x}
                          </span>
                          <span className="font-medium text-xs sm:text-sm">
                            {row.y}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">No geographic data yet</CardTitle>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tech">
            {tech ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {tech.browsers.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <MonitorIcon className="h-4 w-4" />
                        Browsers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 sm:space-y-2">
                        {tech.browsers.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <span className="text-xs sm:text-sm">{row.x}</span>
                            <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {tech.os.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Laptop className="h-4 w-4" />
                        OS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 sm:space-y-2">
                        {tech.os.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <span className="text-xs sm:text-sm">{row.x}</span>
                            <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {tech.devices.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Devices
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 sm:space-y-2">
                        {tech.devices.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <span className="text-xs sm:text-sm capitalize">{row.x}</span>
                            <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">No technical data yet</CardTitle>
                </CardHeader>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
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
    <div className="mx-auto max-w-[1100px] px-4 sm:px-0">
      {isPro ? (
        <NativeAnalytics token={token} />
      ) : (
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <BarChart2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-base sm:text-lg font-semibold">Unlock full analytics with Pro</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pro gives you a real-time dashboard with page views, unique visitors, referrers,
                countries, devices, and more — powered by Umami.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/billing")}
              className="shrink-0 h-10 sm:h-auto"
            >
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
