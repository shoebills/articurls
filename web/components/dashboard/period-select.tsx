"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { endOfDay } from "date-fns";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  AnalyticsPeriod,
  PERIOD_GROUPS,
  buildRangeValue,
  isCustomRange,
  parseRangeValue,
  periodLabel,
} from "@/lib/periods";

const MIN_DATE = new Date(2000, 0, 1);
const MAX_DATE = endOfDay(new Date());

interface PeriodSelectProps {
  value: string;
  onChange: (value: AnalyticsPeriod) => void;
  triggerClassName?: string;
}

export function PeriodSelect({ value, onChange, triggerClassName }: PeriodSelectProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleValueChange = (next: string) => {
    if (next === "__custom__") {
      setPickerOpen(true);
      return;
    }
    onChange(next as AnalyticsPeriod);
  };

  return (
    <>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger
          className={cn("h-10 w-auto min-w-[120px] touch-manipulation sm:h-auto", triggerClassName)}
          aria-label="Analytics time range"
        >
          <span className="truncate">{periodLabel(value)}</span>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_GROUPS.map((group, i) => (
            <SelectGroup key={i}>
              {i > 0 && <SelectSeparator />}
              {group.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectSeparator />
          <SelectItem value="__custom__">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <DateRangePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialPeriod={value}
        onApply={(period) => {
          onChange(period);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

interface DateRangePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeriod: string;
  onApply: (period: AnalyticsPeriod) => void;
}

function DateRangePickerDialog({ open, onOpenChange, initialPeriod, onApply }: DateRangePickerDialogProps) {
  const [mode, setMode] = useState<"single" | "range">(() =>
    isCustomRange(initialPeriod) && isSingleDay(initialPeriod) ? "single" : "range"
  );
  const [singleDate, setSingleDate] = useState<Date | undefined>(() => {
    if (isCustomRange(initialPeriod)) {
      const range = parseRangeValue(initialPeriod);
      if (range && range.start.getTime() === range.end.getTime()) return range.start;
    }
    return new Date();
  });
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (isCustomRange(initialPeriod)) {
      const parsed = parseRangeValue(initialPeriod);
      if (parsed) return { from: parsed.start, to: parsed.end };
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    return { from, to };
  });

  const disabled = { before: MIN_DATE, after: MAX_DATE };

  const canApply =
    mode === "single" ? singleDate !== undefined : !!(range?.from && range?.to);

  const handleApply = () => {
    if (mode === "single" && singleDate) {
      onApply(buildRangeValue(singleDate, singleDate));
      return;
    }
    if (mode === "range" && range?.from && range?.to) {
      onApply(buildRangeValue(range.from, range.to));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(100vw-2rem)] max-w-md rounded-2xl sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Select a custom date range</DialogTitle>

        {/* Single day / Date range toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-1">
            {(["single", "range"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "single" ? "Single day" : "Date range"}
              </button>
            ))}
          </div>
        </div>

        {mode === "single" ? (
          <div className="mx-auto w-fit">
            <Calendar
              mode="single"
              selected={singleDate}
              onSelect={setSingleDate}
              disabled={disabled}
              numberOfMonths={1}
            />
          </div>
        ) : (
          <div className="mx-auto w-fit">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={disabled}
              numberOfMonths={2}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!canApply}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A custom range token covering exactly one calendar day. */
function isSingleDay(period: string): boolean {
  const range = parseRangeValue(period);
  if (!range) return false;
  return range.start.getTime() === range.end.getTime();
}
