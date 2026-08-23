"use client";

import { type DesignSettings } from "@/lib/types";
import { Check, Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ColorPalettePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const theme = settings.color_theme || "base";

  return (
    <div className="flex flex-wrap items-center gap-4">
      {Object.entries({
        base: { label: "Neutral", bg: "#18181b" },
        candy: { label: "Candy", bg: "#ec4899" },
        rainforest: { label: "Rainforest", bg: "#059669" },
        sea: { label: "Sea", bg: "#0284c7" },
        sunset: { label: "Sunset", bg: "#f97316" },
      }).map(([key, { label, bg }]) => {
        const isSelected = theme === key;
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange({ color_theme: key, custom_color: null })}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
                isSelected
                  ? "border-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-105"
                  : "border-transparent opacity-85 hover:opacity-100 hover:scale-105"
              }`}
              style={{ backgroundColor: bg }}
            >
              {isSelected && <Check className="h-4 w-4 text-white" />}
            </div>
            <span
              className={`text-xs font-medium ${
                isSelected ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}

      {/* Custom Color */}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="group flex flex-col items-center gap-1.5 focus:outline-none">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
                theme === "custom"
                  ? "border-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-105"
                  : "border-dashed border-border/80 hover:border-foreground/50 hover:scale-105"
              }`}
              style={{
                backgroundColor: theme === "custom" && settings.custom_color ? settings.custom_color : undefined,
              }}
            >
              {theme === "custom" ? (
                <Check className="h-4 w-4 text-white mix-blend-difference" />
              ) : (
                <Pipette className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                theme === "custom" ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              Custom
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3" align="start">
          <div className="space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Hex Accent</h4>
            <p className="text-xs text-muted-foreground">Pick any brand color for your site.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={settings.custom_color || "#6366f1"}
              onChange={(e) => onChange({ color_theme: "custom", custom_color: e.target.value })}
              className="h-9 w-12 cursor-pointer p-1"
            />
            <Input
              type="text"
              value={settings.custom_color || "#6366f1"}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ color_theme: "custom", custom_color: val });
              }}
              className="font-mono text-xs uppercase"
              placeholder="#6366F1"
              maxLength={7}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}