"use client";

import { type DesignSettings } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONT_OPTIONS = [
  { id: "sans", label: "Modern Sans", desc: "Inter & system sans — clean, versatile, legible", sample: "Aa", fontClass: "font-sans" },
  { id: "serif", label: "Editorial Serif", desc: "Lora / Merriweather — literary and classic", sample: "Aa", fontClass: "font-serif" },
  { id: "mono", label: "Technical Mono", desc: "JetBrains Mono / Fira — code & dev focused", sample: "Aa", fontClass: "font-mono" },
  { id: "jakarta", label: "Geometric SaaS", desc: "Plus Jakarta Sans — modern startup aesthetic", sample: "Aa", fontClass: "font-sans" },
] as const;

export function TypographyPicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const font = settings.font_family || "sans";
  const button = settings.button_style || "rounded";

  return (
    <div className="space-y-6">
      {/* Font Family Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Typography Pairing</label>
        <p className="text-xs text-muted-foreground">
          Curated font families engineered for reading comfort and aesthetic balance.
        </p>

        <div className="pt-1">
          <Select value={font} onValueChange={(val) => onChange({ font_family: val })}>
            <SelectTrigger className="w-full h-12 bg-background border-border/80 text-foreground">
              <SelectValue placeholder="Select typography pairing" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.id} value={f.id} className="py-2.5 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-foreground ${f.fontClass}`}>
                      {f.sample}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{f.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{f.desc}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Button Style */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Button & UI Corner Style</label>
          <p className="text-xs text-muted-foreground">
            Defines the border radius for buttons, badges, and interactive inputs.
          </p>
        </div>

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
                <span className={`text-xs font-medium ${isSelected ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
