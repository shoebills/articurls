"use client";

import { useEffect, useMemo, useState } from "react";
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
  ExternalLink,
  Zap,
  Compass,
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
  const browserLower = browser.toLowerCase();
  if (browserLower.includes("chrome")) return SiGooglechrome;
  if (browserLower.includes("firefox")) return SiFirefox;
  if (browserLower.includes("safari")) return SiSafari;
  if (browserLower.includes("edge")) return FaEdge;
  if (browserLower.includes("opera")) return SiOpera;
  if (browserLower.includes("brave")) return SiBrave;
  if (browserLower.includes("vivaldi")) return SiVivaldi;
  if (browserLower.includes("duckduckgo")) return SiDuckduckgo;
  if (browserLower.includes("samsung")) return SiSamsung;
  if (browserLower.includes("yandex")) return Compass; // fallback lucide icon
  if (browserLower.includes("torbrowser") || browserLower.includes("tor browser") || browserLower.includes("tor ")) return SiTorbrowser;
  if (browserLower.includes("librewolf")) return Zap; // LibreWolf fork of Firefox, use flame-like icon
  if (browserLower.includes("uc browser")) return Globe;
  if (browserLower.includes("maxthon")) return Globe;
  if (browserLower.includes("puffin")) return Globe;
  if (browserLower.includes("sleipnir")) return Globe;
  if (browserLower.includes("palemoon")) return Globe;
  if (browserLower.includes("waterfox")) return Globe;
  if (browserLower.includes("falkon")) return Globe;
  if (browserLower.includes("konqueror")) return Globe;
  if (browserLower.includes("epiphany")) return Globe;
  if (browserLower.includes("midori")) return Globe;
  if (browserLower.includes("luakit")) return Globe;
  if (browserLower.includes("qutebrowser")) return Globe;
  if (browserLower.includes("surf")) return Globe;
  if (browserLower.includes("uzbl")) return Globe;
  if (browserLower.includes("vimb")) return Globe;
  if (browserLower.includes("dillo")) return Globe;
  if (browserLower.includes("netsurf")) return Globe;
  return Globe;
}

function getOsIcon(os: string) {
  const osLower = os.toLowerCase();
  if (osLower === "windows" || osLower.startsWith("windows ")) return MonitorIcon; // use Monitor for Windows
  if (osLower.includes("mac")) return SiApple;
  if (osLower.includes("ubuntu")) return SiUbuntu;
  if (osLower.includes("debian")) return SiDebian;
  if (osLower.includes("fedora")) return SiFedora;
  if (osLower.includes("linux")) return SiLinux;
  if (osLower.includes("android")) return SiAndroid;
  if (osLower.includes("ios")) return SiIos;
  if (osLower.includes("ipad")) return SiIos;
  if (osLower.includes("ipod")) return SiIos;
  if (osLower.includes("chrome")) return MonitorIcon;
  return Laptop;
}

function getDeviceIcon(device: string) {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes("mobile")) return Smartphone;
  if (deviceLower.includes("tablet")) return Smartphone;
  if (deviceLower.includes("ipad")) return Smartphone;
  if (deviceLower.includes("desktop")) return MonitorIcon;
  if (deviceLower.includes("laptop")) return Laptop;
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
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
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

function MetricsTableHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between pb-1 mb-1 border-b text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">
      <span>{label}</span>
      <span>Visitors</span>
    </div>
  );
}

function PathStatusDot({ status }: { status?: "live" | "deleted" | "archived" }) {
  if (status === "live") {
    return (
      <span className="shrink-0 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.3)]" />
    );
  }
  if (status === "deleted") {
    return (
      <span className="shrink-0 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.3)]" />
    );
  }
  if (status === "archived") {
    return (
      <span className="shrink-0 h-2 w-2 rounded-full bg-muted-foreground/50" />
    );
  }
  return <span className="shrink-0 h-2 w-2 rounded-full bg-muted-foreground/25" />;
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

  // Detect browser timezone once — used to display chart labels in local time
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  const trafficSeries = useMemo(() => {
    if (!timeseries) return [];

    // Umami returns full ISO datetimes for all units (e.g. "2025-06-01T00:00:00Z"
    // for day/month). Normalize keys so they match the slot format we generate.
    const normX = (x: string) => {
      if (timeseries.unit === "day") return x.slice(0, 10);
      if (timeseries.unit === "month") return x.slice(0, 7);
      return x;
    };
    const pvMap = new Map(timeseries.pageviews.map((p) => [normX(p.x), p.y]));
    const viMap = new Map(timeseries.visitors.map((p) => [normX(p.x), p.y]));

    if (timeseries.unit === "hour") {
      // Always generate all 24 hourly slots anchored to now-24h → now in UTC.
      // Umami buckets by UTC hour (format: "YYYY-MM-DDTHH:00:00Z") and only
      // returns hours that have data — we fill the rest with zeros.
      //
      // IMPORTANT: snap to UTC hour boundaries, not local time, so the keys
      // match exactly what Umami returns.
      const nowMs = Date.now();
      // Round down to the current UTC hour
      const currentHourMs = nowMs - (nowMs % (60 * 60 * 1000));

      const slots: string[] = [];
      for (let i = 23; i >= 0; i--) {
        const slotMs = currentHourMs - i * 60 * 60 * 1000;
        // Produce "YYYY-MM-DDTHH:00:00Z" — exactly what Umami returns
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

    // Period → slot count mapping
    const periodSlots: Record<string, number> = {
      "7d": 7,
      "28d": 28,
      "3m": 3,
      "6m": 6,
      "1y": 12,
    };

    const slotCount = periodSlots[timeseries.period];

    if (timeseries.unit === "day" && slotCount) {
      // Generate all expected day slots anchored to today in UTC,
      // because the backend queries Umami without a timezone parameter
      // so Umami buckets by UTC days. Days with zero data are filled
      // so keys match exactly what Umami returns.
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
      // Generate all expected month slots anchored to this month in UTC,
      // because the backend queries Umami without a timezone parameter
      // so Umami buckets by UTC months.
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

    // Fallback for “all” (or any future period) — use data-driven keys,
    // but still fill gaps between the min and max observed dates.
    const allKeys = Array.from(new Set([...pvMap.keys(), ...viMap.keys()]));
    if (allKeys.length === 0) return [];
    allKeys.sort();
    const minKey = allKeys[0];
    const maxKey = allKeys[allKeys.length - 1];

    if (timeseries.unit === "month") {
      // Expand all months between min and max (local timezone safe —
      // months always have day=1 so no DST boundary issues).
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

    // Day unit or unknown — expand all days between min and max.
    // Use UTC date arithmetic so keys match Umami's UTC-bucketed output
    // (the backend queries Umami without a timezone parameter).
    const [minY2, minM2, minD2] = minKey.split("-").map(Number);
    const [maxY2, maxM2, maxD2] = maxKey.split("-").map(Number);
    // Count days using UTC dates to avoid DST-related off-by-one
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

            <div className="grid gap-4 lg:grid-cols-3">
              {pages && pages.rows.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Pages</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <MetricsTableHeader label="Page" />
                    <div className="space-y-1 sm:space-y-2">
                      {pages.rows.slice(0, 8).map((row: UmamiMetricsRow, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-2">
                            <PathStatusDot status={row.status} />
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
                    <div className="mt-6 flex items-center gap-4 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_4px_1px_rgba(34,197,94,0.3)]" />
                        Live
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                        Archived
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.3)]" />
                        Deleted
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Pages</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">No data available.</p>
                  </CardContent>
                </Card>
              )}

              {sources && sources.referrers.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <MetricsTableHeader label="Source" />
                    <div className="space-y-1 sm:space-y-2">
                      {sources.referrers.slice(0, 8).map((row: UmamiMetricsRow, i: number) => {
                        const isDirect = !row.x || row.x.trim() === "";
                        const ReferrerIcon = isDirect ? Globe : getReferrerIcon(row.x);
                        return (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-b-0">
                            <div className="flex items-center gap-2">
                              <ReferrerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[220px] sm:max-w-[180px] text-xs sm:text-sm">
                                {isDirect ? "Direct" : row.x}
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Sources</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">No data available.</p>
                  </CardContent>
                </Card>
              )}

              {geo && geo.countries.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Countries</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <MetricsTableHeader label="Country" />
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base sm:text-lg">Countries</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">No data available.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {tech ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {tech.browsers.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base sm:text-lg">Browsers</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <MetricsTableHeader label="Browser" />
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
                      <CardTitle className="text-base sm:text-lg">OS</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <MetricsTableHeader label="OS" />
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
                      <CardTitle className="text-base sm:text-lg">Devices</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <MetricsTableHeader label="Device" />
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Browsers / OS / Devices</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">No data available.</p>
                </CardContent>
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
    <div className="mx-auto max-w-[1100px] sm:px-0">
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
