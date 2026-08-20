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
    <div className="space-y-8 mt-10 border-t border-border/60 pt-8">
      {/* Font Family */}
      <div>
        <h3 className="text-sm font-semibold">4. Font Family</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Typography pairings for headings and body text.
        </p>
        
        <div className="grid grid-cols-1 gap-3">
          {(
            [
              { id: "sans", label: "Modern Sans", desc: "Clean & standard", className: "font-sans" },
              { id: "serif", label: "Editorial Serif", desc: "Literary & elegant", className: "font-serif" },
              { id: "mono", label: "Technical Mono", desc: "Developer focused", className: "font-mono" },
              { id: "jakarta", label: "Geometric SaaS", desc: "Bold & tight", className: "font-sans tracking-tight" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => onChange({ font_family: f.id })}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                font === f.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/60 hover:border-foreground/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex flex-col text-left">
                <span className={`text-base font-semibold ${f.className} ${font === f.id ? "text-primary" : "text-foreground"}`}>
                  {f.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{f.desc}</span>
              </div>
              {font === f.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Button Style */}
      <div>
        <h3 className="text-sm font-semibold">5. Button Style</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          The shape of call-to-actions and interactive elements.
        </p>
        
        <div className="flex flex-wrap gap-3">
          {(
            [
              { id: "pill", label: "Pill", radius: "9999px" },
              { id: "rounded", label: "Rounded", radius: "0.75rem" },
              { id: "square", label: "Square", radius: "0px" },
            ] as const
          ).map((b) => (
            <button
              key={b.id}
              onClick={() => onChange({ button_style: b.id })}
              className={`flex h-10 items-center justify-center border px-6 text-sm font-medium transition-all ${
                button === b.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background text-foreground hover:bg-muted"
              }`}
              style={{ borderRadius: b.radius }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
