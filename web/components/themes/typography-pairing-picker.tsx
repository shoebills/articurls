"use client";

import { type DesignSettings } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const PAIRING_OPTIONS = [
  {
    id: "sans",
    label: "Modern Sans",
    desc: "Inter & system sans — clean, versatile, legible",
    sample: "Aa",
    fontClass: "font-sans",
    heading: "sans",
    content: "sans",
    ui: "sans",
  },
  {
    id: "serif",
    label: "Editorial Serif",
    desc: "Lora & Merriweather — literary and classic reading",
    sample: "Aa",
    fontClass: "font-serif",
    heading: "serif",
    content: "serif",
    ui: "sans",
  },
  {
    id: "mono",
    label: "Technical Mono",
    desc: "JetBrains Mono & Fira — developer & code focused",
    sample: "Aa",
    fontClass: "font-mono",
    heading: "mono",
    content: "sans",
    ui: "mono",
  },
  {
    id: "jakarta",
    label: "Geometric SaaS",
    desc: "Plus Jakarta & Geist — modern startup aesthetic",
    sample: "Aa",
    fontClass: "font-sans tracking-tight",
    heading: "jakarta",
    content: "sans",
    ui: "jakarta",
  },
] as const;

export const FONT_CHOICES = [
  { id: "sans", label: "Modern Sans (Inter / System)", sample: "Aa", fontClass: "font-sans" },
  { id: "serif", label: "Editorial Serif (Lora / Georgia)", sample: "Aa", fontClass: "font-serif" },
  { id: "mono", label: "Technical Mono (JetBrains Mono)", sample: "Aa", fontClass: "font-mono" },
  { id: "jakarta", label: "Geometric SaaS (Geist / Jakarta)", sample: "Aa", fontClass: "font-sans tracking-tight" },
] as const;

export function TypographyPairingPicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const pairing = settings.font_family || "sans";
  const fontHeading = settings.font_heading || "sans";
  const fontContent = settings.font_content || "sans";
  const fontUi = settings.font_ui || "sans";

  const handlePairingChange = (val: string) => {
    const found = PAIRING_OPTIONS.find((p) => p.id === val);
    if (found) {
      onChange({
        font_family: found.id,
        font_heading: found.heading,
        font_content: found.content,
        font_ui: found.ui,
      });
    } else {
      onChange({ font_family: val });
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Curated Pairing Preset */}
      <div className="space-y-2.5">
        <Label className="text-sm font-semibold text-foreground">Curated Pairing</Label>
        <Select value={pairing} onValueChange={handlePairingChange}>
          <SelectTrigger className="mt-2 w-full h-12 bg-background border-border/80 text-foreground cursor-pointer">
            <SelectValue placeholder="Select typography pairing" />
          </SelectTrigger>
          <SelectContent>
            {PAIRING_OPTIONS.map((f) => (
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
            {pairing === "custom" ? (
              <SelectItem value="custom" className="py-2.5 cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-sm font-bold">
                    Aa
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Custom Pairing</div>
                    <div className="text-xs text-muted-foreground">Independently configured fonts</div>
                  </div>
                </div>
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Quickly apply balanced typography across titles, body, and interface elements.
        </p>
      </div>

      {/* Fine-Grained Font Pickers */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Individual Font Pickers</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fine-tune headings, body reading prose, and navigation typography independently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Heading Font */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-foreground">Heading Font</Label>
            <Select
              value={fontHeading}
              onValueChange={(val) =>
                onChange({
                  font_heading: val,
                  font_family: "custom",
                })
              }
            >
              <SelectTrigger className="mt-2 w-full h-10 bg-background border-border/80 text-foreground cursor-pointer text-xs">
                <SelectValue placeholder="Heading font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_CHOICES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs">
                    <span className={c.fontClass}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Applied to titles & hero</p>
          </div>

          {/* Content Font */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-foreground">Content Font</Label>
            <Select
              value={fontContent}
              onValueChange={(val) =>
                onChange({
                  font_content: val,
                  font_family: "custom",
                })
              }
            >
              <SelectTrigger className="mt-2 w-full h-10 bg-background border-border/80 text-foreground cursor-pointer text-xs">
                <SelectValue placeholder="Content font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_CHOICES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs">
                    <span className={c.fontClass}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Article body & essays</p>
          </div>

          {/* UI Font */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-foreground">UI Font</Label>
            <Select
              value={fontUi}
              onValueChange={(val) =>
                onChange({
                  font_ui: val,
                  font_family: "custom",
                })
              }
            >
              <SelectTrigger className="mt-2 w-full h-10 bg-background border-border/80 text-foreground cursor-pointer text-xs">
                <SelectValue placeholder="UI font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_CHOICES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs">
                    <span className={c.fontClass}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Nav, buttons & badges</p>
          </div>
        </div>
      </div>
    </div>
  );
}
