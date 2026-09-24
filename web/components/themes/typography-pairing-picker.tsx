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
  const fontHeading = settings.font_heading || "sans";
  const fontContent = settings.font_content || "sans";
  const fontUi = settings.font_ui || "sans";

  return (
    <div className="max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Heading Font */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-foreground">Heading Font</Label>
          <Select
            value={fontHeading}
            onValueChange={(val) =>
              onChange({
                font_heading: val,
                font_family: "custom",
              })
            }
          >
            <SelectTrigger className="mt-2 w-full h-12 bg-background border-border/80 text-foreground cursor-pointer">
              <SelectValue placeholder="Heading font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_CHOICES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  <span className={c.fontClass}>{c.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Font */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-foreground">Content Font</Label>
          <Select
            value={fontContent}
            onValueChange={(val) =>
              onChange({
                font_content: val,
                font_family: "custom",
              })
            }
          >
            <SelectTrigger className="mt-2 w-full h-12 bg-background border-border/80 text-foreground cursor-pointer">
              <SelectValue placeholder="Content font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_CHOICES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  <span className={c.fontClass}>{c.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* UI Font */}
        <div className="space-y-2.5">
          <Label className="text-sm font-medium text-foreground">UI Font</Label>
          <Select
            value={fontUi}
            onValueChange={(val) =>
              onChange({
                font_ui: val,
                font_family: "custom",
              })
            }
          >
            <SelectTrigger className="mt-2 w-full h-12 bg-background border-border/80 text-foreground cursor-pointer">
              <SelectValue placeholder="UI font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_CHOICES.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                  <span className={c.fontClass}>{c.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
