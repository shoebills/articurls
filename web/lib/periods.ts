import { endOfDay, startOfDay } from "date-fns";

/**
 * Canonical analytics period tokens, shared by the Analytics page and the
 * Audience panel. Tokens match the backend resolver in
 * src/app/umami/service.py and mirror Umami's DateFilter semantics.
 */
export type AnalyticsPeriod =
  | "today"
  | "24h"
  | "this_week"
  | "7d"
  | "this_month"
  | "30d"
  | "90d"
  | "this_year"
  | "6m"
  | "12m"
  | "all"
  | `range:${string}`;

export interface PeriodOption {
  value: AnalyticsPeriod;
  label: string;
}

/** Options grouped for the dropdown, mirroring Umami's divider placement. */
export const PERIOD_GROUPS: PeriodOption[][] = [
  [
    { value: "today", label: "Today" },
    { value: "24h", label: "Last 24 hours" },
  ],
  [
    { value: "this_week", label: "This week" },
    { value: "7d", label: "Last 7 days" },
  ],
  [
    { value: "this_month", label: "This month" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "this_year", label: "This year" },
  ],
  [
    { value: "6m", label: "Last 6 months" },
    { value: "12m", label: "Last 12 months" },
  ],
  [{ value: "all", label: "All time" }],
];

/** Marker value for the "Custom range" entry in the dropdown. */
export const CUSTOM_VALUE = "__custom__";

export function isCustomRange(period: string): boolean {
  return period.startsWith("range:");
}

export interface ParsedRange {
  start: Date; // calendar day (browser-local components of the picked day)
  end: Date;
}

/** Parse `range:<YYYY-MM-DD>:<YYYY-MM-DD>` into local calendar days. */
export function parseRangeValue(period: string): ParsedRange | null {
  if (!isCustomRange(period)) return null;
  const [, startRaw, endRaw] = period.split(":");
  const start = parseIsoDate(startRaw);
  const end = parseIsoDate(endRaw);
  if (!start || !end) return null;
  return { start, end };
}

function parseIsoDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** Build the canonical range token for the picked calendar days. */
export function buildRangeValue(start: Date, end: Date): AnalyticsPeriod {
  return `range:${formatIsoDate(start)}:${formatIsoDate(end)}`;
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dropdown/trigger label for a period value. */
export function periodLabel(period: string): string {
  if (isCustomRange(period)) {
    const range = parseRangeValue(period);
    if (range) return rangeLabel(range.start, range.end);
    return "Custom range";
  }
  for (const group of PERIOD_GROUPS) {
    const hit = group.find((o) => o.value === period);
    if (hit) return hit.label;
  }
  return "Select period";
}

/** "22 May – 7 Oct 2026", or "22 Dec 2025 – 7 Jan 2026" across years. */
export function rangeLabel(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return formatDay(start, true);
  // Omit the start year only when both ends share it — otherwise the
  // range is ambiguous (e.g. "22 Dec – 7 Jan 2026").
  const crossYear = start.getFullYear() !== end.getFullYear();
  return `${formatDay(start, crossYear)} – ${formatDay(end, true)}`;
}

function formatDay(d: Date, withYear: boolean): string {
  // Date holds local components of the picked day — format locally.
  return withYear
    ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Inclusive day count of a range token — used to cap slot-heavy units. */
export function rangeDaySpan(period: string): number {
  const range = parseRangeValue(period);
  if (!range) return 0;
  return Math.round(
    (endOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / 86_400_000
  ) + 1;
}
