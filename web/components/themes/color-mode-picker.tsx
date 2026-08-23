"use client";

import { type DesignSettings } from "@/lib/types";
import { Moon, Sun, Monitor } from "lucide-react";

export function ColorModePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const mode = settings.site_mode || "system";

  return (
    <div className="grid grid-cols-3 gap-3">
      {(
        [
          { id: "light", label: "Light", icon: Sun },
          { id: "dark", label: "Dark", icon: Moon },
          { id: "system", label: "System", icon: Monitor },
        ] as const
      ).map((m) => {
        const isSelected = mode === m.id;
        return (
          <button
            type="button"
            key={m.id}
            onClick={() => onChange({ site_mode: m.id })}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
              isSelected
                ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-2xs"
                : "border-border/70 hover:border-border hover:bg-muted/30"
            }`}
          >
            <m.icon
              className={`h-4 w-4 ${
                isSelected ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isSelected ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {m.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}