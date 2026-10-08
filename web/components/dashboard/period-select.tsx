"use client";

import { useState } from "react";
import { addMonths, endOfDay, startOfMonth } from "date-fns";
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
  // Bumped on every open so the picker remounts with state seeded from the
  // current period — reopening never shows a stale previous selection.
  const [pickerKey, setPickerKey] = useState(0);

  const handleValueChange = (next: string) => {
    if (next === "__custom__") {
      setPickerOpen(true);
      setPickerKey((k) => k + 1);
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
        <SelectContent hideScrollButtons>
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
        key={pickerKey}
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
  // Seeded once on mount (the dialog is remounted on every open).
  const [initial] = useState(() => resolveInitialPicker(initialPeriod));
  const [mode, setMode] = useState<"single" | "range">(initial.mode);
  const [singleDate, setSingleDate] = useState<Date | undefined>(initial.singleDate);
  const [startDate, setStartDate] = useState<Date>(initial.startDate);
  const [endDate, setEndDate] = useState<Date>(initial.endDate);
  const [leftMonth, setLeftMonth] = useState<Date>(initial.leftMonth);
  const [rightMonth, setRightMonth] = useState<Date>(initial.rightMonth);

  const invalidRange = startDate.getTime() > endDate.getTime();
  const canApply = mode === "single" ? singleDate !== undefined : !invalidRange;

  const handleApply = () => {
    if (mode === "single" && singleDate) {
      onApply(buildRangeValue(singleDate, singleDate));
      return;
    }
    if (mode === "range") {
      onApply(buildRangeValue(startDate, endDate));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-fit sm:w-fit max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl"
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
              onSelect={(d) => d && setSingleDate(d)}
              disabled={{ before: MIN_DATE, after: MAX_DATE }}
              numberOfMonths={1}
            />
          </div>
        ) : (
          <div className="mx-auto flex w-fit flex-col gap-4 md:flex-row md:gap-6">
            {/* Umami's DatePickerForm model: the left calendar picks the start
                date and the right calendar the end date. Each navigates its
                own month independently. */}
            <div className="flex flex-col">
              <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
                Start date
              </p>
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                disabled={{ before: MIN_DATE, after: endDate }}
                month={leftMonth}
                onMonthChange={setLeftMonth}
                startMonth={startOfMonth(MIN_DATE)}
                endMonth={startOfMonth(MAX_DATE)}
                numberOfMonths={1}
              />
            </div>
            <div className="flex flex-col">
              <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
                End date
              </p>
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => d && setEndDate(d)}
                disabled={{ before: startDate, after: MAX_DATE }}
                month={rightMonth}
                onMonthChange={setRightMonth}
                startMonth={startOfMonth(MIN_DATE)}
                endMonth={startOfMonth(MAX_DATE)}
                numberOfMonths={1}
              />
            </div>
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

interface InitialPickerState {
  mode: "single" | "range";
  singleDate: Date | undefined;
  startDate: Date;
  endDate: Date;
  leftMonth: Date;
  rightMonth: Date;
}

/** Seed all picker state from a period token (used on mount and on open). */
function resolveInitialPicker(period: string): InitialPickerState {
  const parsed = isCustomRange(period) ? parseRangeValue(period) : null;
  const single = !!parsed && parsed.start.getTime() === parsed.end.getTime();

  const defaultTo = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 6);

  const start = parsed?.start ?? defaultFrom;
  const end = parsed?.end ?? defaultTo;
  const startMonth = startOfMonth(start);
  const endMonth = startOfMonth(end);

  return {
    mode: single ? "single" : "range",
    singleDate: parsed?.start ?? new Date(),
    startDate: start,
    endDate: end,
    leftMonth: startMonth,
    // Left shows the start month, right the end month; never the same month twice.
    rightMonth: endMonth > startMonth ? endMonth : addMonths(startMonth, 1),
  };
}