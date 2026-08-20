"use client";

import { type DesignSettings } from "@/lib/types";
import { AlignLeft, AlignCenter, AlignRight, PanelTop, AppWindow, Minus } from "lucide-react";

export function NavbarPicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const align = settings.navbar_alignment || "left";
  const style = settings.navbar_style || "bordered";

  return (
    <div className="space-y-6">
      {/* Navigation Bar Alignment */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Header Alignment</label>
          <p className="text-xs text-muted-foreground">
            Arrangement of your site brand logo and navigation menu links.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { id: "left", icon: AlignLeft, label: "Left Aligned" },
              { id: "center", icon: AlignCenter, label: "Centered" },
              { id: "right", icon: AlignRight, label: "Right Aligned" },
            ] as const
          ).map((a) => {
            const isSelected = align === a.id;
            return (
              <button
                type="button"
                key={a.id}
                onClick={() => onChange({ navbar_alignment: a.id })}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] text-primary ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <a.icon className="h-5 w-5" />
                <span className={`text-xs font-medium ${isSelected ? "text-foreground font-semibold" : ""}`}>
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Navigation Bar Style */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-foreground">Header Style</label>
          <p className="text-xs text-muted-foreground">
            Visual presentation and container framing for the navigation bar.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { id: "bordered", icon: PanelTop, label: "Bordered" },
              { id: "floating", icon: AppWindow, label: "Floating Pill" },
              { id: "minimal", icon: Minus, label: "Minimal Seamless" },
            ] as const
          ).map((s) => {
            const isSelected = style === s.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => onChange({ navbar_style: s.id })}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/[0.03] text-primary ring-1 ring-primary/20 shadow-2xs"
                    : "border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <s.icon className="h-5 w-5" />
                <span className={`text-xs font-medium ${isSelected ? "text-foreground font-semibold" : ""}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
