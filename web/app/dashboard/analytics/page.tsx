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
  UmamiOverviewResponse,
  UmamiTimeseriesResponse,
  UmamiPagesResponse,
  UmamiSourcesResponse,
  UmamiGeoResponse,
  UmamiTechResponse,
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

import {
  BarChart2,
  Users,
  Eye,
  Loader2,
  TrendingDown,
  Clock,
  Smartphone,
  Laptop,
  Monitor as MonitorIcon,
  Globe,
  FileText,
  ArrowUpRight,
  Search,
  X,
  MessageCircle,
  ExternalLink,
  Image,
  Users2,
  Video,
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

function getCountryFlag(code: string): string {
  const codeUpper = code.toUpperCase();
  if (codeUpper.length !== 2) return "";
  const offset = 0x1F1E6;
  const first = codeUpper.charCodeAt(0) - 0x41 + offset;
  const second = codeUpper.charCodeAt(1) - 0x41 + offset;
  return String.fromCodePoint(first, second);
}

const COUNTRY_NAMES: Record<string, string> = {
  SG: "Singapore",
  IN: "India",
  US: "United States",
  NL: "Netherlands",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  CN: "China",
  BR: "Brazil",
  RU: "Russia",
  KR: "South Korea",
  MX: "Mexico",
  ES: "Spain",
  IT: "Italy",
  ID: "Indonesia",
  TH: "Thailand",
  MY: "Malaysia",
  PH: "Philippines",
  VN: "Vietnam",
  PL: "Poland",
  TR: "Turkey",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  IL: "Israel",
  EG: "Egypt",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
};

function getReferrerIcon(domain: string) {
  const domainLower = domain.toLowerCase();
  if (domainLower.includes("google")) return Search;
  if (domainLower.includes("t.co") || domainLower.includes("twitter") || domainLower.includes("x.com")) return X;
  if (domainLower.includes("instagram")) return Image;
  if (domainLower.includes("facebook") || domainLower.includes("fb.com")) return Users2;
  if (domainLower.includes("linkedin")) return Users;
  if (domainLower.includes("youtube")) return Video;
  if (domainLower.includes("reddit")) return MessageCircle;
  return ExternalLink;
}

function getBrowserIcon(browser: string) {
  const browserLower = browser.toLowerCase();
  if (browserLower.includes("chrome")) return MonitorIcon;
  if (browserLower.includes("firefox")) return MonitorIcon;
  if (browserLower.includes("safari")) return MonitorIcon;
  if (browserLower.includes("edge")) return MonitorIcon;
  return MonitorIcon;
}

function getOsIcon(os: string) {
  const osLower = os.toLowerCase();
  if (osLower.includes("windows")) return Laptop;
  if (osLower.includes("mac")) return Laptop;
  if (osLower.includes("linux")) return Laptop;
  if (osLower.includes("android")) return Smartphone;
  if (osLower.includes("ios")) return Smartphone;
  return Laptop;
}

function getDeviceIcon(device: string) {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes("mobile")) return Smartphone;
  if (deviceLower.includes("tablet")) return Smartphone;
  if (deviceLower.includes("desktop")) return Laptop;
  return Laptop;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const totalSeconds = Math.round(seconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
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
      <CardContent className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mb-1">
              {title}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate">
              {value}
            </p>
            {description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <div className="shrink-0 mt-0.5">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground opacity-70" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <Skeleton className="h-3 w-16 sm:h-3.5 sm:w-20 mb-2" />
            <Skeleton className="h-6 w-24 sm:h-8 sm:w-28" />
          </div>
          <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 rounded-md" />
        </div>
      </CardContent>
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
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
          <Skeleton className="h-56 sm:h-72 w-full rounded-lg border" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                title="Bounce Rate"
                value={overview?.overview.bounce_rate != null ? `${overview.overview.bounce_rate}%` : "—"}
                icon={TrendingDown}
              />
              <KpiCard
                title="Avg Duration"
                value={overview?.overview.avg_visit_time != null ? formatDuration(overview.overview.avg_visit_time) : "—"}
                icon={Clock}
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
                    margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.35}/>
                          <stop offset="100%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.58 0.18 280)" stopOpacity={0.35}/>
                          <stop offset="100%" stopColor="oklch(0.58 0.18 280)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} opacity={0.4} />
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip
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
                        dataKey="pageviews"
                        name="Pageviews"
                        stroke="oklch(0.6 0.15 145)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPageviews)"
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        name="Visitors"
                        stroke="oklch(0.58 0.18 280)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorVisitors)"
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              {pages && pages.rows.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 sm:space-y-2">
                      {pages.rows.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[220px] sm:max-w-[180px] text-xs sm:text-sm">
                              {row.x}
                            </span>
                          </div>
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

              {sources && sources.referrers.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4" />
                      Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 sm:space-y-2">
                      {sources.referrers.slice(0, 8).map((row: UmamiMetricsRow, i: number) => {
                        const ReferrerIcon = getReferrerIcon(row.x);
                        return (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex items-center gap-2">
                              <ReferrerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[220px] sm:max-w-[180px] text-xs sm:text-sm">
                                {row.x}
                              </span>
                            </div>
                            <span className="font-medium text-xs sm:text-sm">
                              {row.y}
                            </span>
                          </div>
                        );
                      })}
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

              {geo && geo.countries.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Countries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 sm:space-y-2">
                      {geo.countries.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(row.x)}</span>
                            <span className="text-xs sm:text-sm">
                              {COUNTRY_NAMES[row.x.toUpperCase()] || row.x}
                            </span>
                          </div>
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
                    <CardTitle className="text-base sm:text-lg">No geographic data yet</CardTitle>
                  </CardHeader>
                </Card>
              )}
            </div>

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
                        {tech.browsers.slice(0, 8).map((row: UmamiMetricsRow, i: number) => {
                          const BrowserIcon = getBrowserIcon(row.x);
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <BrowserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs sm:text-sm">{row.x}</span>
                              </div>
                              <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                            </div>
                          );
                        })}
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
                        {tech.os.slice(0, 8).map((row: UmamiMetricsRow, i: number) => {
                          const OsIcon = getOsIcon(row.x);
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <OsIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs sm:text-sm">{row.x}</span>
                              </div>
                              <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                            </div>
                          );
                        })}
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
                        {tech.devices.slice(0, 8).map((row: UmamiMetricsRow, i: number) => {
                          const DeviceIcon = getDeviceIcon(row.x);
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs sm:text-sm capitalize">{row.x}</span>
                              </div>
                              <span className="font-medium text-xs sm:text-sm">{row.y}</span>
                            </div>
                          );
                        })}
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
        </div>
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
