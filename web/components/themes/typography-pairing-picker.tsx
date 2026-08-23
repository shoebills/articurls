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

export function TypographyPairingPicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const font = settings.font_family || "sans";

  return (
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
  );
}