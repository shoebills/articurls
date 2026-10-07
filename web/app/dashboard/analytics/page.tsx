"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  AnalyticsPeriod,
  getUmamiOverview,
  getUmamiTimeseries,
  getUmamiMetrics,
  getUmamiExpandedMetrics,
  UmamiOverviewResponse,
  UmamiTimeseriesResponse,
  UmamiMetricsRow,
  UmamiMetricsType,
  UmamiExpandedMetricsRow,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  Users,
  Eye,
  TrendingDown,
  Clock,
  Smartphone,
  Laptop,
  Monitor as MonitorIcon,
  Globe,
  ExternalLink,
  Zap,
  Compass,
  Maximize2,
  Search,
  Download,
  X,
  MapPin,
  Building2,
  Radio,
  FileText,
} from "lucide-react";
import {
  SiGooglechrome,
  SiFirefox,
  SiSafari,
  SiOpera,
  SiBrave,
  SiVivaldi,
  SiDuckduckgo,
  SiSamsung,
  SiTorbrowser,
  SiApple,
  SiLinux,
  SiUbuntu,
  SiDebian,
  SiFedora,
  SiAndroid,
  SiIos,
  SiGoogle,
  SiX,
  SiInstagram,
  SiFacebook,
  SiYoutube,
  SiReddit,
  SiDiscord,
  SiGithub,
  SiPinterest,
  SiTiktok,
  SiWhatsapp,
  SiTelegram,
  SiSlack,
  SiQuora,
  SiMedium,
  SiTumblr,
  SiFlickr,
  SiVimeo,
  SiTwitch,
  SiSpotify,
  SiSoundcloud,
  SiStackoverflow,
  SiCodepen,
  SiCodesandbox,
  SiGitlab,
  SiBitbucket,
  SiDevdotto,
  SiHashnode,
  SiDribbble,
  SiBehance,
  SiFigma,
  SiCanva,
  SiProducthunt,
  SiYcombinator,
  SiBaidu,
} from "react-icons/si";
import {
  FaEdge,
  FaLinkedinIn,
} from "react-icons/fa6";
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
import { DashboardBreadcrumb } from "@/components/settings-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

function getCountryFlag(code: string): string {
  const codeUpper = (code || "").toUpperCase();
  if (codeUpper.length !== 2) return "";
  const offset = 0x1F1E6;
  const first = codeUpper.charCodeAt(0) - 0x41 + offset;
  const second = codeUpper.charCodeAt(1) - 0x41 + offset;
  return String.fromCodePoint(first, second);
}

const countryName = new Intl.DisplayNames(["en"], { type: "region" });

function getReferrerIcon(domain: string) {
  const domainLower = (domain || "").toLowerCase();
  if (domainLower.includes("google")) return SiGoogle;
  if (domainLower.includes("t.co") || domainLower.includes("twitter") || domainLower.includes("x.com")) return SiX;
  if (domainLower.includes("instagram")) return SiInstagram;
  if (domainLower.includes("facebook") || domainLower.includes("fb.com")) return SiFacebook;
  if (domainLower.includes("linkedin")) return FaLinkedinIn;
  if (domainLower.includes("youtube")) return SiYoutube;
  if (domainLower.includes("reddit")) return SiReddit;
  if (domainLower.includes("discord")) return SiDiscord;
  if (domainLower.includes("github")) return SiGithub;
  if (domainLower.includes("pinterest")) return SiPinterest;
  if (domainLower.includes("tiktok")) return SiTiktok;
  if (domainLower.includes("whatsapp")) return SiWhatsapp;
  if (domainLower.includes("telegram")) return SiTelegram;
  if (domainLower.includes("slack")) return SiSlack;
  if (domainLower.includes("quora")) return SiQuora;
  if (domainLower.includes("medium")) return SiMedium;
  if (domainLower.includes("tumblr")) return SiTumblr;
  if (domainLower.includes("flickr")) return SiFlickr;
  if (domainLower.includes("vimeo")) return SiVimeo;
  if (domainLower.includes("twitch")) return SiTwitch;
  if (domainLower.includes("spotify")) return SiSpotify;
  if (domainLower.includes("soundcloud")) return SiSoundcloud;
  if (domainLower.includes("duckduckgo")) return SiDuckduckgo;
  if (domainLower.includes("bing")) return Globe;
  if (domainLower.includes("yahoo")) return Globe;
  if (domainLower.includes("baidu")) return SiBaidu;
  if (domainLower.includes("stackoverflow") || domainLower.includes("stackexchange")) return SiStackoverflow;
  if (domainLower.includes("codepen")) return SiCodepen;
  if (domainLower.includes("codesandbox")) return SiCodesandbox;
  if (domainLower.includes("gitlab")) return SiGitlab;
  if (domainLower.includes("bitbucket")) return SiBitbucket;
  if (domainLower.includes("dev.to")) return SiDevdotto;
  if (domainLower.includes("hashnode")) return SiHashnode;
  if (domainLower.includes("dribbble")) return SiDribbble;
  if (domainLower.includes("behance")) return SiBehance;
  if (domainLower.includes("figma")) return SiFigma;
  if (domainLower.includes("canva")) return SiCanva;
  if (domainLower.includes("producthunt")) return SiProducthunt;
  if (domainLower.includes("hackernews") || domainLower.includes("news.ycombinator")) return SiYcombinator;
  return ExternalLink;
}

function getBrowserIcon(browser: string) {
  const browserLower = (browser || "").toLowerCase();
  if (browserLower.includes("chrome")) return SiGooglechrome;
  if (browserLower.includes("firefox")) return SiFirefox;
  if (browserLower.includes("safari")) return SiSafari;
  if (browserLower.includes("edge")) return FaEdge;
  if (browserLower.includes("opera")) return SiOpera;
  if (browserLower.includes("brave")) return SiBrave;
  if (browserLower.includes("vivaldi")) return SiVivaldi;
  if (browserLower.includes("duckduckgo")) return SiDuckduckgo;
  if (browserLower.includes("samsung")) return SiSamsung;
  if (browserLower.includes("yandex")) return Compass;
  if (browserLower.includes("torbrowser") || browserLower.includes("tor browser") || browserLower.includes("tor ")) return SiTorbrowser;
  if (browserLower.includes("librewolf")) return Zap;
  return Globe;
}

function getOsIcon(os: string) {
  const osLower = (os || "").toLowerCase();
  if (osLower === "windows" || osLower.startsWith("windows ")) return MonitorIcon;
  if (osLower.includes("mac")) return SiApple;
  if (osLower.includes("ubuntu")) return SiUbuntu;
  if (osLower.includes("debian")) return SiDebian;
  if (osLower.includes("fedora")) return SiFedora;
  if (osLower.includes("linux")) return SiLinux;
  if (osLower.includes("android")) return SiAndroid;
  if (osLower.includes("ios") || osLower.includes("ipad") || osLower.includes("ipod")) return SiIos;
  if (osLower.includes("chrome")) return MonitorIcon;
  return Laptop;
}

function getDeviceIcon(device: string) {
  const deviceLower = (device || "").toLowerCase();
  if (deviceLower.includes("mobile") || deviceLower.includes("tablet") || deviceLower.includes("ipad")) return Smartphone;
  if (deviceLower.includes("desktop")) return MonitorIcon;
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

function formatChartLabel(value: string, unit?: string, tz?: string): string {
  if (unit === "hour") {
    try {
      const date = new Date(value);
      return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      });
    } catch {
      const timePart = value.replace("T", " ").slice(11, 16);
      return timePart || value.slice(0, 16);
    }
  }

  if (unit === "month") {
    try {
      const date = new Date(value);
      return date.toLocaleDateString(undefined, { month: "short" });
    } catch {
      return value.slice(0, 7);
    }
  }

  try {
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return value.slice(0, 10);
  }
}

function renderMetricIcon(type: UmamiMetricsType, value: string) {
  if (type === "country") {
    const flag = getCountryFlag(value);
    if (flag) return <span className="text-base shrink-0 leading-none mr-0.5">{flag}</span>;
    return <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "region") {
    return <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "city") {
    return <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "referrer") {
    if (!value || value.trim() === "") {
      return <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
    const ReferrerIcon = getReferrerIcon(value);
    return <ReferrerIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "channel") {
    return <Radio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "browser") {
    const BrowserIcon = getBrowserIcon(value);
    return <BrowserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "os") {
    const OsIcon = getOsIcon(value);
    return <OsIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "device") {
    const DeviceIcon = getDeviceIcon(value);
    return <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
  if (type === "path" || type === "fullPath" || type === "entry" || type === "exit") {
    return <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />;
  }
  return null;
}

function renderMetricLabel(type: UmamiMetricsType, value: string): string {
  if (!value || value.trim() === "") {
    if (type === "referrer") return "Direct";
    return "/";
  }
  if (type === "country") {
    try {
      return countryName.of(value.toUpperCase()) || value;
    } catch {
      return value;
    }
  }
  if (type === "device") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value;
}

interface TabConfig {
  id: UmamiMetricsType;
  label: string;
  header: string;
}

interface CardConfig {
  id: string;
  title: string;
  tabs: TabConfig[];
}

const CARDS_CONFIG: CardConfig[] = [
  {
    id: "pages",
    title: "Pages",
    tabs: [
      { id: "path", label: "Path", header: "Path" },
      { id: "fullPath", label: "URL", header: "URL" },
      { id: "entry", label: "Entry page", header: "Path" },
      { id: "exit", label: "Exit page", header: "Path" },
    ],
  },
  {
    id: "sources",
    title: "Sources",
    tabs: [
      { id: "referrer", label: "Referrers", header: "Referrer" },
      { id: "channel", label: "Channels", header: "Channel" },
    ],
  },
  {
    id: "environment",
    title: "Environment",
    tabs: [
      { id: "browser", label: "Browsers", header: "Browser" },
      { id: "os", label: "OS", header: "OS" },
      { id: "device", label: "Devices", header: "Device" },
    ],
  },
  {
    id: "location",
    title: "Location",
    tabs: [
      { id: "country", label: "Countries", header: "Country" },
      { id: "region", label: "Regions", header: "Region" },
      { id: "city", label: "Cities", header: "City" },
    ],
  },
];

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

function ExpandedMetricsModal({
  isOpen,
  onClose,
  token,
  period,
  cardTitle,
  tab,
}: {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  period: AnalyticsPeriod;
  cardTitle: string;
  tab: TabConfig;
}) {
  const [data, setData] = useState<UmamiExpandedMetricsRow[]>([]);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const currentKey = `${tab.id}:${period}`;
  const loading = currentKey !== loadedKey;

  const isSession = ["browser", "os", "device", "country", "region", "city"].includes(tab.id);
  const isPathTab = ["path", "fullPath", "entry", "exit"].includes(tab.id);

  useEffect(() => {
    if (!isOpen || !token) return;
    let cancelled = false;

    getUmamiExpandedMetrics(token, tab.id, period, 100)
      .then((res) => {
        if (!cancelled) {
          setData(res.rows || []);
          setError(null);
          setLoadedKey(currentKey);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load expanded metrics");
          setLoadedKey(currentKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, token, tab.id, period, currentKey]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((r) => {
      const label = renderMetricLabel(tab.id, r.name).toLowerCase();
      const rawName = (r.name || "").toLowerCase();
      return label.includes(q) || rawName.includes(q);
    });
  }, [data, search, tab.id]);

  const handleDownload = () => {
    if (!filteredRows.length) return;
    const headers = isSession
      ? [tab.header, "Visitors", "Visits", "Views", "Bounce rate", "Visit duration"]
      : [tab.header, "Visitors", "Visits", "Views"];

    const lines = [headers.join(",")];
    for (const r of filteredRows) {
      const name = `"${renderMetricLabel(tab.id, r.name).replace(/"/g, '""')}"`;
      if (isSession) {
        const bounce = r.visits > 0
          ? `${Math.round((Math.min(r.visits, r.bounces ?? 0) / r.visits) * 100)}%`
          : "0%";
        const duration = r.visits > 0
          ? formatDuration((r.totaltime ?? 0) / r.visits)
          : "0s";
        lines.push([name, r.visitors, r.visits, r.pageviews, `"${bounce}"`, `"${duration}"`].join(","));
      } else {
        lines.push([name, r.visitors, r.visits, r.pageviews].join(","));
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tab.id}-metrics.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!w-[min(calc(100vw-2rem),56rem)] !max-w-4xl max-h-[85vh] p-4 sm:p-6 flex flex-col gap-4">
        <DialogTitle className="sr-only">
          {cardTitle} - {tab.label}
        </DialogTitle>

        {/* Top Controls: Search input on left, Download and Close on right */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={handleDownload}
              title="Download CSV"
              disabled={!filteredRows.length}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table View: Horizontally scrollable on mobile */}
        <div className="overflow-x-auto max-h-[60vh] -mx-4 px-4 sm:-mx-6 sm:px-6">
          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data available.</p>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm min-w-[550px] border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground font-medium text-xs">
                  <th className="py-2 pr-3 font-medium">{tab.header}</th>
                  <th className="py-2 px-3 font-medium text-right">Visitors</th>
                  <th className="py-2 px-3 font-medium text-right">Visits</th>
                  <th className="py-2 px-3 font-medium text-right">Views</th>
                  {isSession && (
                    <>
                      <th className="py-2 px-3 font-medium text-right">Bounce rate</th>
                      <th className="py-2 pl-3 font-medium text-right">Visit duration</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredRows.map((row, i) => {
                  const bounceRate = row.visits > 0
                    ? `${Math.round((Math.min(row.visits, row.bounces ?? 0) / row.visits) * 100)}%`
                    : "0%";
                  const duration = row.visits > 0
                    ? formatDuration((row.totaltime ?? 0) / row.visits)
                    : "0s";
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-3 max-w-[280px]">
                        <div className="flex items-center gap-2 truncate">
                          {renderMetricIcon(tab.id, row.name)}
                          <span
                            className={cn(
                              "truncate text-foreground",
                              isPathTab && "hover:underline cursor-pointer"
                            )}
                            title={row.name}
                          >
                            {renderMetricLabel(tab.id, row.name)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {row.visitors.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {row.visits.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {row.pageviews.toLocaleString()}
                      </td>
                      {isSession && (
                        <>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">
                            {bounceRate}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-muted-foreground">
                            {duration}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsMetricsCard({
  config,
  token,
  period,
  onOpenMore,
}: {
  config: CardConfig;
  token: string;
  period: AnalyticsPeriod;
  onOpenMore: (cardTitle: string, tab: TabConfig) => void;
}) {
  const [activeTabId, setActiveTabId] = useState<UmamiMetricsType>(config.tabs[0].id);
  const [cache, setCache] = useState<Record<string, UmamiMetricsRow[]>>({});

  const activeTabConfig = config.tabs.find((t) => t.id === activeTabId) || config.tabs[0];
  const cacheKey = `${activeTabId}:${period}`;
  const rows = cache[cacheKey];
  const loading = rows === undefined;

  useEffect(() => {
    if (cache[cacheKey] !== undefined) return;
    let cancelled = false;

    getUmamiMetrics(token, activeTabId, period, 10)
      .then((res) => {
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [cacheKey]: res.rows || [] }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [cacheKey]: [] }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, activeTabId, period, cacheKey, cache]);

  const totalVisitors = useMemo(() => {
    if (!rows || !rows.length) return 0;
    return rows.reduce((sum, r) => sum + r.y, 0);
  }, [rows]);

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg font-semibold">{config.title}</CardTitle>
        {/* Tabs Row */}
        <div className="flex items-center gap-4 sm:gap-6 border-b border-border/50 pt-2 pb-0 overflow-x-auto scrollbar-none">
          {config.tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={cn(
                  "text-xs sm:text-sm font-medium pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer",
                  isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 sm:px-6 pb-3 flex-1 flex flex-col justify-between">
        <div>
          {/* Table Header */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/40 text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide px-2">
            <span>{activeTabConfig.header}</span>
            <span>Visitors</span>
          </div>

          {/* Rows List */}
          {loading && rows === undefined ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-7 w-full rounded" />
            </div>
          ) : !rows || rows.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground py-8 text-center">
              No data available.
            </p>
          ) : (
            <div className="space-y-1">
              {rows.slice(0, 10).map((row, i) => {
                const percent = totalVisitors > 0
                  ? Math.round((row.y / totalVisitors) * 100)
                  : 0;

                return (
                  <div
                    key={i}
                    className="relative flex items-center justify-between py-1.5 px-2 rounded-md overflow-hidden group hover:bg-muted/30 transition-colors"
                  >
                    {/* Background Progress Bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-muted/60 dark:bg-muted/40 rounded transition-all duration-300 pointer-events-none"
                      style={{ width: `${percent}%` }}
                    />

                    {/* Left: Icon + Label */}
                    <div className="relative z-10 flex items-center gap-2 min-w-0 pr-2">
                      {renderMetricIcon(activeTabId, row.x)}
                      <span
                        className="text-xs sm:text-sm truncate font-medium text-foreground"
                        title={row.x}
                      >
                        {renderMetricLabel(activeTabId, row.x)}
                      </span>
                    </div>

                    {/* Right: Count + Divider + Percentage */}
                    <div className="relative z-10 flex items-center shrink-0 text-xs sm:text-sm">
                      <span className="font-semibold text-foreground text-right min-w-[32px]">
                        {row.y.toLocaleString()}
                      </span>
                      <span className="mx-2 text-border text-muted-foreground/40">|</span>
                      <span className="text-muted-foreground text-right min-w-[32px]">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: More Button */}
        <div className="pt-3 mt-2 flex justify-center border-t border-border/40">
          <button
            type="button"
            onClick={() => onOpenMore(config.title, activeTabConfig)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1 px-3 rounded hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3 w-3" />
            <span>More</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function NativeAnalytics({ token }: { token: string }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [overview, setOverview] = useState<UmamiOverviewResponse | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<UmamiOverviewResponse>("/analytics/umami/overview?period=7d", t) : null;
  });
  const [timeseries, setTimeseries] = useState<UmamiTimeseriesResponse | null>(() => {
    if (typeof window === "undefined") return null;
    const t = localStorage.getItem("articurls_token");
    return t ? getCachedApiData<UmamiTimeseriesResponse>("/analytics/umami/timeseries?period=7d", t) : null;
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/analytics/umami/overview?period=7d", t) &&
      apiCacheHas("/analytics/umami/timeseries?period=7d", t)
    );
  });

  const [err, setErr] = useState<string | null>(null);

  // Modal State for expanded details popup
  const [expandedModal, setExpandedModal] = useState<{
    cardTitle: string;
    tab: TabConfig;
  } | null>(null);

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [o, t] = await Promise.all([
          getUmamiOverview(token, period),
          getUmamiTimeseries(token, period),
        ]);
        if (!cancelled) {
          setOverview(o);
          setTimeseries(t);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof ApiError ? e.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, period]);

  const trafficSeries = useMemo(() => {
    if (!timeseries) return [];

    const normX = (x: string) => {
      if (timeseries.unit === "day") return x.slice(0, 10);
      if (timeseries.unit === "month") return x.slice(0, 7);
      return x;
    };
    const pvMap = new Map(timeseries.pageviews.map((p) => [normX(p.x), p.y]));
    const viMap = new Map(timeseries.visitors.map((p) => [normX(p.x), p.y]));

    if (timeseries.unit === "hour") {
      const nowMs = Date.now();
      const currentHourMs = nowMs - (nowMs % (60 * 60 * 1000));
      const slots: string[] = [];
      for (let i = 24; i >= 0; i--) {
        const slotMs = currentHourMs - i * 60 * 60 * 1000;
        const d = new Date(slotMs);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const hh = String(d.getUTCHours()).padStart(2, "0");
        slots.push(`${yyyy}-${mm}-${dd}T${hh}:00:00Z`);
      }

      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    const periodSlots: Record<string, number> = {
      "7d": 7,
    };

    const slotCount = periodSlots[timeseries.period];

    if (timeseries.unit === "day" && slotCount) {
      const now = new Date();
      const slots: string[] = [];
      for (let i = slotCount - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - i,
        ));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        slots.push(`${yyyy}-${mm}-${dd}`);
      }
      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    if (timeseries.unit === "month" && slotCount) {
      const now = new Date();
      const slots: string[] = [];
      for (let i = slotCount - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - i,
          1,
        ));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        slots.push(`${yyyy}-${mm}`);
      }
      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    if (timeseries.period === "this_year") {
      const now = new Date();
      const slots: string[] = [];
      const currentMonth = now.getUTCMonth();
      for (let i = 0; i <= currentMonth; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), i, 1));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        slots.push(`${yyyy}-${mm}`);
      }
      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    if (timeseries.period === "1y") {
      const now = new Date();
      const slots: string[] = [];
      const prevYear = now.getUTCFullYear() - 1;
      for (let i = 0; i < 12; i++) {
        const d = new Date(Date.UTC(prevYear, i, 1));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        slots.push(`${yyyy}-${mm}`);
      }
      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    const allKeys = Array.from(new Set([...pvMap.keys(), ...viMap.keys()]));
    if (allKeys.length === 0) return [];
    allKeys.sort();
    const minKey = allKeys[0];
    const maxKey = allKeys[allKeys.length - 1];

    if (timeseries.unit === "month") {
      const [minY, minM] = minKey.split("-").map(Number);
      const [maxY, maxM] = maxKey.split("-").map(Number);
      const totalMonths = (maxY - minY) * 12 + (maxM - minM) + 1;
      const slots: string[] = [];
      for (let i = 0; i < totalMonths; i++) {
        const d = new Date(Date.UTC(minY, minM - 1 + i, 1));
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        slots.push(`${yyyy}-${mm}`);
      }
      return slots.map((x) => ({
        x,
        pageviews: pvMap.get(x) ?? 0,
        visitors: viMap.get(x) ?? 0,
      }));
    }

    const [minY2, minM2, minD2] = minKey.split("-").map(Number);
    const [maxY2, maxM2, maxD2] = maxKey.split("-").map(Number);
    const startDate = new Date(Date.UTC(minY2, minM2 - 1, minD2));
    const endDate = new Date(Date.UTC(maxY2, maxM2 - 1, maxD2));
    const dayCount =
      Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const slots: string[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(Date.UTC(minY2, minM2 - 1, minD2 + i));
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      slots.push(`${yyyy}-${mm}-${dd}`);
    }
    return slots.map((x) => ({
      x,
      pageviews: pvMap.get(x) ?? 0,
      visitors: viMap.get(x) ?? 0,
    }));
  }, [timeseries]);

  const trafficLabelFormatter = (value: string | number) =>
    formatChartLabel(String(value), timeseries?.unit, userTz);
  const trafficTooltipLabelFormatter = (label: unknown) =>
    formatChartLabel(String(label ?? ""), timeseries?.unit, userTz);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      <DashboardBreadcrumb
        trail={[{ label: "Dashboard", href: "/dashboard" }, { label: "Analytics" }]}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        </div>
        <div className="w-auto shrink-0">
          <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}>
            <SelectTrigger className="h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto" aria-label="Analytics time range">
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
          {/* Top KPI Cards */}
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

          {/* Traffic Timeseries Chart */}
          {timeseries && (
            <Card>
              <CardHeader className="px-4 pb-2 pt-4 sm:p-9 sm:pb-2">
                <CardTitle className="text-base sm:text-lg">Traffic</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Pageviews and visitors over time.</CardDescription>
              </CardHeader>
              <CardContent className="h-56 px-2 pt-0 sm:h-64 sm:p-9 sm:pt-0 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trafficSeries}
                    margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
                  >
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
                    <XAxis
                      dataKey="x"
                      tick={{ fontSize: 10 }}
                      tickFormatter={trafficLabelFormatter}
                      tickLine={false}
                      axisLine={false}
                      interval={trafficSeries.length > 10 ? "preserveStartEnd" : 0}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      labelFormatter={trafficTooltipLabelFormatter}
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

          {/* 4 Umami-style Cards in 2x2 Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {CARDS_CONFIG.map((card) => (
              <AnalyticsMetricsCard
                key={card.id}
                config={card}
                token={token}
                period={period}
                onOpenMore={(cardTitle, tab) => {
                  setExpandedModal({ cardTitle, tab });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expanded Metrics Details Popup */}
      {expandedModal && (
        <ExpandedMetricsModal
          isOpen={true}
          onClose={() => setExpandedModal(null)}
          token={token}
          period={period}
          cardTitle={expandedModal.cardTitle}
          tab={expandedModal.tab}
        />
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { token, loading } = useAuth();

  if (!token || loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
        <DashboardBreadcrumb
          trail={[{ label: "Dashboard", href: "/dashboard" }, { label: "Analytics" }]}
        />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
          <Skeleton className="h-56 sm:h-72 w-full rounded-lg border" />
        </div>
      </div>
    );
  }

  return <NativeAnalytics token={token} />;
}
