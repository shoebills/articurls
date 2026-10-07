"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, Geometry } from "geojson";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { getUmamiMetrics, AnalyticsPeriod, UmamiMetricsRow } from "@/lib/api";
import { ISO_COUNTRIES } from "@/lib/iso-countries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

// Stable style object so React.memo on Geography paths isn't broken by
// identity churn; hover emphasis is handled through fillOpacity/stroke.
const PATH_STYLE = { outline: "none" } as const;

type MapGeography = Feature<Geometry> & {
  rsmKey: string;
  svgPath: string | null;
};

function countryName(iso2: string, fallback: string): string {
  try {
    return COUNTRY_NAMES.of(iso2) || fallback;
  } catch {
    return fallback;
  }
}

export function GeographyCard({
  token,
  period,
}: {
  token: string;
  period: AnalyticsPeriod;
}) {
  const [cache, setCache] = useState<Record<string, UmamiMetricsRow[]>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: [0, 40],
    zoom: 0.8,
  });
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const rows = cache[period];
  const loading = rows === undefined;
  const loadFailed = errors[period] === true;

  useEffect(() => {
    if (rows !== undefined) return;
    let cancelled = false;

    getUmamiMetrics(token, "country", period, 250)
      .then((res) => {
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [period]: res.rows || [] }));
          setErrors((prev) => ({ ...prev, [period]: false }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCache((prev) => ({ ...prev, [period]: [] }));
          setErrors((prev) => ({ ...prev, [period]: true }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, period, rows]);

  const { countryMap, maxCount } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const row of rows ?? []) {
      // Umami country rows already carry ISO-2 codes; the ISO_COUNTRIES
      // lookup is only for the map file's ISO-3 feature ids (see below).
      const code = String(row.x ?? "").trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) continue;
      const next = (map.get(code) ?? 0) + row.y;
      map.set(code, next);
      if (next > max) max = next;
    }
    return { countryMap: map, maxCount: max };
  }, [rows]);

  const handleZoomIn = () =>
    setView((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.5) }));
  const handleZoomOut = () =>
    setView((v) => ({ ...v, zoom: Math.max(0.7, v.zoom / 1.5) }));
  const handleReset = () => setView({ center: [0, 40], zoom: 0.8 });

  const handleMoveEnd = (pos: { coordinates?: [number, number]; zoom?: number }) => {
    if (pos?.coordinates) {
      setView({ center: [pos.coordinates[0], pos.coordinates[1]], zoom: pos.zoom ?? view.zoom });
    }
  };

  // Tooltip position is updated directly on the DOM node so moving the mouse
  // never triggers a React re-render.
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const tip = tooltipRef.current;
    if (!container || !tip) return;
    const rect = container.getBoundingClientRect();
    const left = event.clientX - rect.left + 14;
    const top = event.clientY - rect.top + 14;
    const maxLeft = rect.width - tip.offsetWidth - 8;
    const maxTop = rect.height - tip.offsetHeight - 8;
    tip.style.left = `${Math.min(left, Math.max(8, maxLeft))}px`;
    tip.style.top = `${Math.min(top, Math.max(8, maxTop))}px`;
  };

  const hoveredCount = hoveredCode ? (countryMap.get(hoveredCode) ?? 0) : 0;
  const hoveredName = hoveredCode
    ? countryName(hoveredCode, hoveredCode)
    : null;

  const renderGeography = (geo: MapGeography) => {
    const iso2 = ISO_COUNTRIES[String(geo.id ?? "")];
    if (!iso2) return null; // e.g. Antarctica — not tracked
    const count = countryMap.get(iso2) ?? 0;
    const isHovered = hoveredCode === iso2;
    const ratio = maxCount > 0 ? count / maxCount : 0;

    return (
      <Geography
        key={geo.rsmKey}
        geography={geo}
        fill={count > 0 ? "var(--primary)" : "var(--muted)"}
        fillOpacity={count > 0 ? (isHovered ? 1 : 0.3 + 0.7 * ratio) : 1}
        stroke={isHovered ? "var(--foreground)" : "var(--border)"}
        strokeWidth={isHovered ? 1 : 0.5}
        vectorEffect="non-scaling-stroke"
        className="cursor-pointer"
        style={PATH_STYLE}
        onMouseEnter={() => setHoveredCode(iso2)}
        onMouseLeave={() => setHoveredCode(null)}
      />
    );
  };

  return (
    <Card className="min-w-0 w-full overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 px-3 pt-4 pb-2 sm:px-6">
        <div className="min-w-0">
          <CardTitle className="text-base sm:text-lg font-semibold">Geography</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Visitor distribution by country.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleReset}
            title="Reset view"
            aria-label="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-4 pt-0 sm:px-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-lg sm:h-80" />
        ) : countryMap.size === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-border/60 bg-muted/20 sm:h-80">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {loadFailed ? "Failed to load map data." : "No data available."}
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/20"
            onMouseMove={handleMouseMove}
          >
            <ComposableMap
              projection="geoMercator"
              width={800}
              height={500}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              <ZoomableGroup
                center={view.center}
                zoom={view.zoom}
                minZoom={0.7}
                maxZoom={8}
                translateExtent={[
                  [-400, -250],
                  [1200, 750],
                ]}
                onMoveEnd={handleMoveEnd}
              >
                <Geographies geography="/datamaps.world.json">
                  {({ geographies }) => <>{geographies.map(renderGeography)}</>}
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {hoveredCode && (
              <div
                ref={tooltipRef}
                className="pointer-events-none absolute left-0 top-0 z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md"
              >
                {hoveredName}: {hoveredCount.toLocaleString()} visitor
                {hoveredCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
