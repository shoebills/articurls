"use client";

import { type ButtonStyle, type ButtonVariant, type DesignSettings } from "@/lib/types";
import { Label } from "@/components/ui/label";

const RADIUS_OPTIONS: { id: ButtonStyle; label: string; previewClass: string }[] = [
  { id: "pill", label: "Pill", previewClass: "rounded-full" },
  { id: "rounded", label: "Rounded", previewClass: "rounded-lg" },
  { id: "square", label: "Sharp", previewClass: "rounded-none" },
];

const VARIANT_OPTIONS: { id: ButtonVariant; label: string; desc: string }[] = [
  { id: "solid", label: "Solid", desc: "Filled with primary color" },
  { id: "outline", label: "Outline", desc: "Crisp border with transparent fill" },
  { id: "soft", label: "Soft", desc: "Subtle tinted background" },
];

export function ButtonStylePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const radius = (settings.button_style as ButtonStyle) || "rounded";
  const variant = settings.button_variant || "solid";

  const getPreviewClasses = (r: ButtonStyle, v: ButtonVariant) => {
    const radClass = r === "pill" ? "rounded-full" : r === "square" ? "rounded-none" : "rounded-lg";
    if (v === "outline") {
      return `${radClass} border-2 border-primary bg-transparent text-primary`;
    }
    if (v === "soft") {
      return `${radClass} border border-primary/25 bg-primary/15 text-primary`;
    }
    return `${radClass} bg-primary text-primary-foreground border-transparent`;
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Corner Radius */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground">Corner Radius</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {RADIUS_OPTIONS.map((b) => {
            const isSelected = radius === b.id;
            return (
              <button
                type="button"
                key={b.id}
                onClick={() => onChange({ button_style: b.id })}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div
                  className={`flex h-7 w-16 items-center justify-center border text-[11px] font-semibold ${b.previewClass} ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/60 text-muted-foreground"
                  }`}
                >
                  Aa
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
      </div>

      {/* Style Variant */}
      <div className="space-y-2.5 pt-4 border-t border-border/60">
        <Label className="text-sm font-semibold text-foreground">Style Variant</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {VARIANT_OPTIONS.map((v) => {
            const isSelected = variant === v.id;
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => onChange({ button_variant: v.id })}
                className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                }`}
              >
                <div
                  className={`flex h-7 w-16 items-center justify-center text-[11px] font-semibold ${getPreviewClasses(
                    radius,
                    v.id
                  )}`}
                >
                  Aa
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-xs font-medium ${
                      isSelected ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {v.label}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Controls the visual appearance of CTA buttons, search triggers, and newsletter submission inputs.
        </p>
      </div>

      {/* Live Interactive Preview */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-foreground">Interactive Preview</div>
          <div className="text-xs text-muted-foreground">This is how action buttons will appear to your readers.</div>
        </div>
        <button
          type="button"
          className={`h-9 px-4 text-xs font-medium transition-all shadow-2xs shrink-0 cursor-default ${getPreviewClasses(
            radius,
            variant
          )}`}
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}
