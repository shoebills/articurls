"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style calendar built on react-day-picker v10.
 * Note: rDP v10 applies selection styling via the `modifiersClassNames`
 * prop (it never adds `selected`/`range_*` classes on its own), so all
 * selection styling lives there — not in `day` variants.
 */
function Calendar({
  className,
  classNames,
  modifiersClassNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      animate={false}
      className={cn("p-1", className)}
      classNames={{
        // Stack months on mobile, side-by-side from md up.
        months: "relative flex flex-col gap-4 md:flex-row md:gap-6",
        month: "relative flex flex-col",
        month_caption: "flex h-9 items-center justify-center text-sm font-medium",
        month_grid: "mt-1",
        weekdays: "flex",
        weekday: "flex w-9 items-center justify-center text-[0.7rem] font-medium text-muted-foreground",
        weeks: "flex flex-col",
        week: "flex mt-1",
        day: "flex w-9 items-center justify-center p-0 text-sm",
        day_button: cn(
          "flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal cursor-pointer text-inherit",
          "transition-colors hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-30"
        ),
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          "absolute left-0 flex h-8 w-8 items-center justify-center rounded-md cursor-pointer",
          "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-30"
        ),
        button_next: cn(
          "absolute right-0 flex h-8 w-8 items-center justify-center rounded-md cursor-pointer",
          "transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-30"
        ),
        ...classNames,
      }}
      modifiersClassNames={{
        selected: "rounded-md bg-primary text-primary-foreground",
        range_start: "rounded-md bg-primary text-primary-foreground",
        range_end: "rounded-md bg-primary text-primary-foreground",
        range_middle: "rounded-none bg-accent",
        today: "font-semibold",
        ...modifiersClassNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
