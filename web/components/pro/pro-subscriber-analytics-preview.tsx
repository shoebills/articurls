"use client";

import { useMemo } from "react";
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
import { TrendingDown, TrendingUp, Users2 } from "lucide-react";
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
  { timestamp: "Mon", gained: 5, lost: 1 },
  { timestamp: "Tue", gained: 8, lost: 0 },
  { timestamp: "Wed", gained: 3, lost: 2 },
  { timestamp: "Thu", gained: 12, lost: 1 },
  { timestamp: "Fri", gained: 7, lost: 3 },
  { timestamp: "Sat", gained: 4, lost: 0 },
  { timestamp: "Sun", gained: 9, lost: 1 },
];

export function SubscriberAnalyticsPreview() {
  const { isPro } = useAuth();

  const chart = useMemo(() => CHART_DATA, []);

  return (
    <ProLockOverlay
      isPro={isPro}
      title="Unlock Subscriber Analytics"
      description="Track new subscribers, unsubscribes, and growth over time."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <Select defaultValue="7d">
            <SelectTrigger
              className="h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto"
              aria-label="Subscribers time range"
            >
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
          <Button
            variant="outline"
            className="h-10 w-full shrink-0 touch-manipulation sm:h-auto sm:w-auto sm:min-h-9"
          >
            Export CSV
          </Button>
        </div>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mb-1">
                    New subscribers
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate">
                    48
                  </p>
                </div>
                <div className="shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground opacity-70" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mb-1">
                    Unsubscribes
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate">
                    8
                  </p>
                </div>
                <div className="shrink-0 mt-0.5">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground opacity-70" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium mb-1">
                    Current subscribers
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight truncate">
                    156
                  </p>
                </div>
                <div className="shrink-0 mt-0.5">
                  <Users2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-muted-foreground opacity-70" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="px-4 pb-6 pt-4 sm:p-9 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">
              Subscribers trend
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              New subscribers and unsubscribes over time.
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
                    id="previewSubColorGained"
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
                    id="previewSubColorLost"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="oklch(0.55 0.2 25)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="oklch(0.55 0.2 25)"
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
                  dataKey="timestamp"
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
                  dataKey="gained"
                  name="Subscribed"
                  stroke="oklch(0.6 0.15 145)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#previewSubColorGained)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="lost"
                  name="Unsubscribed"
                  stroke="oklch(0.55 0.2 25)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#previewSubColorLost)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </ProLockOverlay>
  );
}
