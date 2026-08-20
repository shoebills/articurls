"use client";

import { useState } from "react";
import { type DesignSettings } from "@/lib/types";
import { Check, Moon, Sun, Monitor } from "lucide-react";
import { COLOR_PALETTES } from "./theme-wrapper";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ColorPicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const mode = settings.site_mode || "system";
  const theme = settings.color_theme || "base";

  return (
    <div className="space-y-8 mt-10 border-t border-border/60 pt-8">
      {/* Site Mode */}
      <div>
        <h3 className="text-sm font-semibold">2. Site Mode</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Control the default color scheme of your publication.
        </p>
        <div className="flex flex-wrap gap-3">
          {(
            [
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "System", icon: Monitor },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onChange({ site_mode: m.id })}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                mode === m.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 bg-background text-muted-foreground hover:border-foreground/50 hover:text-foreground"
              }`}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Theme */}
      <div>
        <h3 className="text-sm font-semibold">3. Blog Theme</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Choose a color personality for your buttons, links, and accents.
        </p>
        
        <div className="flex flex-wrap gap-4">
          {Object.entries({
            base: "Neutral",
            candy: "Candy",
            rainforest: "Rainforest",
            sea: "Sea",
            sunset: "Sunset",
          }).map(([key, label]) => {
            const isSelected = theme === key;
            const primaryColor = COLOR_PALETTES[key as keyof typeof COLOR_PALETTES].light.primary;
            return (
              <button
                key={key}
                onClick={() => onChange({ color_theme: key, custom_color: null })}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                    isSelected ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: `oklch(from ${primaryColor} l c h)` }}
                >
                  {isSelected && <Check className="h-5 w-5 text-white mix-blend-difference" />}
                </div>
                <span className={`text-[11px] font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            );
          })}
          
          <Popover>
            <PopoverTrigger asChild>
              <button className="group flex flex-col items-center gap-2">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                    theme === "custom" ? "border-foreground scale-110 shadow-md" : "border-border border-dashed hover:scale-105"
                  }`}
                  style={{ backgroundColor: theme === "custom" && settings.custom_color ? settings.custom_color : "var(--muted)" }}
                >
                  {theme === "custom" ? (
                    <Check className="h-5 w-5 text-white mix-blend-difference" />
                  ) : (
                    <span className="text-muted-foreground">+</span>
                  )}
                </div>
                <span className={`text-[11px] font-medium ${theme === "custom" ? "text-foreground" : "text-muted-foreground"}`}>
                  Custom
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Custom Hex Color</h4>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={settings.custom_color || "#6366f1"}
                    onChange={(e) => onChange({ color_theme: "custom", custom_color: e.target.value })}
                    className="h-10 w-14 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={settings.custom_color || "#6366f1"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
                        onChange({ color_theme: "custom", custom_color: val });
                      } else {
                        // Allow typing, wait for valid hex
                        onChange({ color_theme: "custom", custom_color: val });
                      }
                    }}
                    className="flex-1 font-mono uppercase"
                    placeholder="#HEXCODE"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
