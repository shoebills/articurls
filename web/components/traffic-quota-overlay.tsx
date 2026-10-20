"use client";

import Link from "next/link";
import { ArrowUpRight, Gauge, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountUsage } from "@/lib/types";

function formatViews(value: number) {
  return value.toLocaleString();
}

export function QuotaExceededPopup({ usage }: { usage: AccountUsage }) {
  const limitText =
    usage.tier_limit !== null ? formatViews(usage.tier_limit) : "your monthly";

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-background/95 p-6 backdrop-blur-sm md:p-8">
      <div className="my-auto w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 text-center shadow-xl shadow-black/[0.04]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-200/50">
          <Gauge className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Monthly traffic limit exceeded
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your blogs used {formatViews(usage.total_pageviews)} of {limitText}{" "}
          monthly pageviews. Your public blogs remain live for readers, but
          dashboard access is paused until you upgrade your plan or your usage
          resets on the 1st.
        </p>
        <div className="mt-8 space-y-3">
          <Button asChild className="h-12 w-full gap-2 text-base shadow-md shadow-primary/20">
            <Link href="/dashboard/billing/upgrade">
              <ArrowUpRight className="h-4 w-4" />
              Upgrade your plan
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Usage resets automatically on the 1st of every month.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TrafficAlertBanner({ usage }: { usage: AccountUsage }) {
  const isOverLimit = usage.quota_status === "over_limit";
  const styles = isOverLimit
    ? "border-red-500/30 bg-red-500/[0.07] text-red-900 dark:text-red-300"
    : "border-amber-500/30 bg-amber-500/[0.07] text-amber-900 dark:text-amber-200";
  const metricClass = isOverLimit
    ? "bg-red-500/10 text-red-900 dark:text-red-300"
    : "bg-amber-500/10 text-amber-900 dark:text-amber-200";

  const limitText = usage.tier_limit !== null ? formatViews(usage.tier_limit) : "";
  const pct = usage.usage_percentage ?? 0;

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${styles}`}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
        <p className="min-w-0 text-sm leading-snug font-medium">
          {isOverLimit
            ? usage.tier_limit !== null
              ? `You've reached your ${limitText} monthly pageview limit. Upgrade your plan to avoid dashboard interruption.`
              : "You've reached your monthly pageview limit. Upgrade your plan to avoid dashboard interruption."
            : usage.tier_limit !== null
              ? `You've used ${pct}% of your ${limitText} monthly pageview limit. Upgrade your plan to increase your allowance.`
              : "You're nearing your monthly pageview limit. Upgrade your plan to increase your allowance."}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${metricClass}`}>
          {formatViews(usage.total_pageviews)}
          {usage.tier_limit !== null ? ` / ${limitText}` : ""} views
        </span>
        <Button asChild size="sm" variant="outline" className="h-7 gap-1 rounded-md border-current/40 bg-background/60 px-2.5 text-xs font-semibold">
          <Link href="/dashboard/billing/upgrade">
            <ArrowUpRight className="h-3 w-3" />
            Upgrade
          </Link>
        </Button>
      </div>
    </div>
  );
}
