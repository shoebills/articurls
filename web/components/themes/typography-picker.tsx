"use client";

import { type DesignSettings } from "@/lib/types";
import { Check } from "lucide-react";

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
      {/* Font Family */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Typography Pairing</label>
          <p className="text-xs text-muted-foreground">
            Curated font families engineered for reading comfort and aesthetic balance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { id: "sans", label: "Modern Sans", desc: "Inter & system sans — clean, versatile, legible", sample: "Aa Bb Gg" },
              { id: "serif", label: "Editorial Serif", desc: "Lora / Merriweather — literary and classic", sample: "Aa Bb Gg" },
              { id: "mono", label: "Technical Mono", desc: "JetBrains Mono / Fira — code & dev focused", sample: "Aa Bb Gg" },
              { id: "jakarta", label: "Geometric SaaS", desc: "Plus Jakarta Sans — modern startup aesthetic", sample: "Aa Bb Gg" },
            ] as const
          ).map((f) => {
            const isSelected = font === f.id;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => onChange({ font_family: f.id })}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xl font-bold tracking-tight ${
                    f.id === "serif" ? "font-serif" : f.id === "mono" ? "font-mono" : "font-sans"
                  }`}>
                    {f.sample}
                  </span>
                  {isSelected && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{f.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </button>
            );
          })}
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
