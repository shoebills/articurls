"use client";

import { type DesignSettings } from "@/lib/types";
import { Check, AlignLeft, AlignCenter, AlignRight, AppWindow, PanelTop, Minus } from "lucide-react";

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
    <div className="space-y-8 mt-10 border-t border-border/60 pt-8 pb-10">
      {/* Navigation Bar Alignment */}
      <div>
        <h3 className="text-sm font-semibold">6. Navigation Bar</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          How your logo and links are presented in the header.
        </p>
        
        <div className="mb-6 space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Alignment</label>
          <div className="flex gap-2">
            {(
              [
                { id: "left", icon: AlignLeft, label: "Left" },
                { id: "center", icon: AlignCenter, label: "Center" },
                { id: "right", icon: AlignRight, label: "Right" },
              ] as const
            ).map((a) => (
              <button
                key={a.id}
                onClick={() => onChange({ navbar_alignment: a.id })}
                className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  align === a.id
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <a.icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Style</label>
          <div className="flex gap-2">
            {(
              [
                { id: "bordered", icon: PanelTop, label: "Bordered" },
                { id: "floating", icon: AppWindow, label: "Floating" },
                { id: "minimal", icon: Minus, label: "Minimal" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => onChange({ navbar_style: s.id })}
                className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  style === s.id
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <s.icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
