"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Users, TrendingDown, Clock } from "lucide-react";
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
import { ProLockOverlay } from "@/components/pro/pro-lock-overlay";

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
];

const CHART_DATA = [
  { x: "Mon", pageviews: 180, visitors: 95 },
  { x: "Tue", pageviews: 240, visitors: 130 },
  { x: "Wed", pageviews: 310, visitors: 175 },
  { x: "Thu", pageviews: 270, visitors: 150 },
  { x: "Fri", pageviews: 350, visitors: 200 },
  { x: "Sat", pageviews: 190, visitors: 110 },
  { x: "Sun", pageviews: 420, visitors: 245 },
];

const PAGES = [
  { x: "/blog/getting-started", y: 342 },
  { x: "/blog/typescript-guide", y: 287 },
  { x: "/blog/react-patterns", y: 231 },
  { x: "/about", y: 156 },
  { x: "/", y: 143 },
  { x: "/blog/tailwind-tips", y: 98 },
];

const SOURCES = [
  { x: "google.com", y: 512 },
  { x: "twitter.com", y: 187 },
  { x: "github.com", y: 134 },
  { x: "Direct", y: 98 },
  { x: "reddit.com", y: 71 },
];

const COUNTRIES = [
  { x: "US", y: 423 },
  { x: "IN", y: 287 },
  { x: "GB", y: 154 },
  { x: "DE", y: 98 },
  { x: "CA", y: 76 },
];

const BROWSERS = [
  { x: "Chrome", y: 512 },
  { x: "Firefox", y: 198 },
  { x: "Safari", y: 167 },
  { x: "Edge", y: 89 },
];

const OPERATING_SYSTEMS = [
  { x: "Windows", y: 367 },
  { x: "macOS", y: 245 },
  { x: "Linux", y: 123 },
  { x: "Android", y: 98 },
  { x: "iOS", y: 67 },
];

const DEVICES = [
  { x: "Desktop", y: 534 },
  { x: "Mobile", y: 312 },
  { x: "Tablet", y: 87 },
];

function KpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
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
          </div>
          <div className="shrink-0 mt-0.5">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground opacity-70" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTable({
  label,
  rows,
}: {
  label: string;
  rows: { x: string; y: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between pb-1 mb-1 border-b text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide">
          <span>{label}</span>
          <span>Visitors</span>
        </div>
        <div className="space-y-1 sm:space-y-2">
          {rows.slice(0, 6).map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <span className="truncate max-w-[180px] text-xs sm:text-sm">
                {row.x}
              </span>
              <span className="font-medium text-xs sm:text-sm">{row.y}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPreview() {
  const { isPro } = useAuth();

  const chart = useMemo(() => CHART_DATA, []);

  return (
    <div className="mx-auto max-w-[1100px]">
      <ProLockOverlay
        isPro={isPro}
        title="Unlock Analytics"
        description="Get real-time pageviews, sources, countries, browsers, and more."
      >
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Analytics
            </h1>
            <Select defaultValue="7d">
              <SelectTrigger className="h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto">
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
          <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Pageviews" value="1,247" icon={Eye} />
            <KpiCard title="Visitors" value="684" icon={Users} />
            <KpiCard title="Bounce Rate" value="42%" icon={TrendingDown} />
            <KpiCard title="Avg Duration" value="2m 34s" icon={Clock} />
          </div>

          <Card>
            <CardHeader className="px-4 pb-2 pt-4 sm:p-9 sm:pb-2">
              <CardTitle className="text-base sm:text-lg">Traffic</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Pageviews and visitors over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56 px-2 pt-0 sm:h-64 sm:p-9 sm:pt-0 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart}
                  margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
                >
                  <defs>
                    <linearGradient
                      id="previewColorPageviews"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="oklch(0.6 0.15 145)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(0.6 0.15 145)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="previewColorVisitors"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="oklch(0.58 0.18 280)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="oklch(0.58 0.18 280)"
                        stopOpacity={0}
                      />
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
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: "10px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
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
                    fill="url(#previewColorPageviews)"
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke="oklch(0.58 0.18 280)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#previewColorVisitors)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <MetricTable label="Pages" rows={PAGES} />
            <MetricTable label="Sources" rows={SOURCES} />
            <MetricTable label="Countries" rows={COUNTRIES} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MetricTable label="Browsers" rows={BROWSERS} />
            <MetricTable label="OS" rows={OPERATING_SYSTEMS} />
            <MetricTable label="Devices" rows={DEVICES} />
          </div>
        </div>
      </div>
      </ProLockOverlay>
    </div>
  );
}
