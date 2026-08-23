"use client";

import { type DesignSettings } from "@/lib/types";

export function ButtonStylePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const button = settings.button_style || "rounded";

  return (
    <div className="grid grid-cols-3 gap-3">
      {(
        [
          { id: "pill", label: "Pill", radius: "9999px", preview: "rounded-full" },
          { id: "rounded", label: "Rounded", radius: "0.5rem", preview: "rounded-lg" },
          { id: "square", label: "Sharp", radius: "0px", preview: "rounded-none" },
        ] as const
      ).map((b) => {
        const isSelected = button === b.id;
        return (
          <button
            type="button"
            key={b.id}
            onClick={() => onChange({ button_style: b.id })}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-all ${
              isSelected
                ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-2xs"
                : "border-border/70 hover:border-border hover:bg-muted/30"
            }`}
          >
            <div
              className={`flex h-8 w-20 items-center justify-center border text-xs font-semibold ${b.preview} ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/60 text-muted-foreground"
              }`}
            >
              Preview
            </div>
            <span
              className={`text-xs font-medium ${
                isSelected ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {b.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}