"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { type ColorPalette, type DesignSettings } from "@/lib/types";
import { Check, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";

export const DEFAULT_PALETTES: Record<string, ColorPalette> = {
  base: {
    primary: "#18181b",
    primary_text: "#ffffff",
    secondary: "#f4f4f5",
    secondary_text: "#18181b",
    background: "#ffffff",
    background_text: "#09090b",
    link: "#2563eb",
  },
  candy: {
    primary: "#ec4899",
    primary_text: "#ffffff",
    secondary: "#fdf2f8",
    secondary_text: "#831843",
    background: "#ffffff",
    background_text: "#09090b",
    link: "#db2777",
  },
  rainforest: {
    primary: "#059669",
    primary_text: "#ffffff",
    secondary: "#ecfdf5",
    secondary_text: "#064e3b",
    background: "#ffffff",
    background_text: "#09090b",
    link: "#059669",
  },
  sea: {
    primary: "#0284c7",
    primary_text: "#ffffff",
    secondary: "#f0f9ff",
    secondary_text: "#0c4a6e",
    background: "#ffffff",
    background_text: "#09090b",
    link: "#0284c7",
  },
  sunset: {
    primary: "#f97316",
    primary_text: "#ffffff",
    secondary: "#fff7ed",
    secondary_text: "#7c2d12",
    background: "#ffffff",
    background_text: "#09090b",
    link: "#ea580c",
  },
};

const PRESET_META: Record<string, { label: string; bg: string }> = {
  base: { label: "Neutral", bg: "#18181b" },
  candy: { label: "Candy", bg: "#ec4899" },
  rainforest: { label: "Rainforest", bg: "#059669" },
  sea: { label: "Sea", bg: "#0284c7" },
  sunset: { label: "Sunset", bg: "#f97316" },
};

export function ColorPalettePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const theme = settings.color_theme || "base";
  const activePalette: ColorPalette = {
    ...(DEFAULT_PALETTES[theme] || DEFAULT_PALETTES.base),
    ...(settings.color_palette || {}),
  };

  const [showCustom, setShowCustom] = useState(theme === "custom");
  const prevThemeRef = useRef(theme);

  useEffect(() => {
    const prev = prevThemeRef.current;
    if (theme === "custom" && prev !== "custom") {
      setShowCustom(true);
    } else if (theme !== "custom" && prev === "custom") {
      setShowCustom(false);
    }
    prevThemeRef.current = theme;
  }, [theme]);

  const handlePresetSelect = (key: string) => {
    const presetPalette = DEFAULT_PALETTES[key] || DEFAULT_PALETTES.base;
    onChange({
      color_theme: key,
      color_palette: presetPalette,
    });
  };

  const handleTokenChange = (key: keyof ColorPalette, value: string) => {
    const updated = {
      ...activePalette,
      [key]: value,
    };
    onChange({
      color_theme: "custom",
      color_palette: updated,
    });
  };

  return (
    <div className="space-y-6">
      {/* Quick Select Presets */}
      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(PRESET_META).map(([key, { label, bg }]) => {
          const isSelected = theme === key && !showCustom;
          return (
            <button
              type="button"
              key={key}
              onClick={() => {
                const wasCustomOpen = showCustom;
                setShowCustom(false);
                // Avoid redundant patch if already on this preset and custom panel was closed
                if (theme === key && !wasCustomOpen) return;
                handlePresetSelect(key);
              }}
              className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
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

        {/* Custom Toggle Swatch */}
        <button
          type="button"
          onClick={() => {
            setShowCustom((prev) => !prev);
            if (theme !== "custom") {
              onChange({
                color_theme: "custom",
                color_palette: activePalette,
              });
            }
          }}
          className="group flex flex-col items-center gap-1.5 focus:outline-none cursor-pointer"
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
              theme === "custom"
                ? "border-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background scale-105 bg-primary/10 text-primary"
                : "border-dashed border-border/80 hover:border-foreground/50 hover:scale-105 bg-muted/40 text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <span
            className={`text-xs font-medium ${
              theme === "custom" ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            Custom
          </span>
        </button>
      </div>

      {/* Custom Fine-Grained Palette Inputs */}
      {showCustom ? (
        <div className="space-y-5 pt-2 border-t border-border/60 max-w-xl">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Custom Color Palette</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize brand, surface, background, and link tokens across your blog.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary Main */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Primary Main</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.primary}
                  onChange={(e) => handleTokenChange("primary", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.primary}
                  onChange={(e) => handleTokenChange("primary", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">CTA buttons, active pills & accents</p>
            </div>

            {/* Primary Text */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Primary Text</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.primary_text}
                  onChange={(e) => handleTokenChange("primary_text", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.primary_text}
                  onChange={(e) => handleTokenChange("primary_text", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Text inside primary CTA buttons</p>
            </div>

            {/* Secondary Main */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Secondary Main</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.secondary}
                  onChange={(e) => handleTokenChange("secondary", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.secondary}
                  onChange={(e) => handleTokenChange("secondary", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Category pills, subtle chips & cards</p>
            </div>

            {/* Secondary Text */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Secondary Text</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.secondary_text}
                  onChange={(e) => handleTokenChange("secondary_text", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.secondary_text}
                  onChange={(e) => handleTokenChange("secondary_text", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Text on secondary chips and badges</p>
            </div>

            {/* Background Main */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Background Main</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.background}
                  onChange={(e) => handleTokenChange("background", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.background}
                  onChange={(e) => handleTokenChange("background", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Page and surface background color</p>
            </div>

            {/* Background Text */}
            <div className="space-y-2.5">
              <Label className="text-xs font-medium text-foreground">Body Text</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={activePalette.background_text}
                  onChange={(e) => handleTokenChange("background_text", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.background_text}
                  onChange={(e) => handleTokenChange("background_text", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Foreground text for titles & prose</p>
            </div>

            {/* Link */}
            <div className="space-y-2.5 sm:col-span-2">
              <Label className="text-xs font-medium text-foreground">Link Color</Label>
              <div className="flex items-center gap-2 mt-2 max-w-sm">
                <input
                  type="color"
                  value={activePalette.link}
                  onChange={(e) => handleTokenChange("link", e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-md border border-border p-0.5 bg-background shrink-0"
                />
                <Input
                  type="text"
                  value={activePalette.link}
                  onChange={(e) => handleTokenChange("link", e.target.value)}
                  className="font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Hyperlinks in article content and pages</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
