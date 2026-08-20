"use client";

import React, { useEffect, useState } from "react";
import type { PublicUser } from "@/lib/types";

// The 5 curated presets
export const COLOR_PALETTES = {
  base: {
    light: {
      background: "oklch(0.985 0.004 260)",
      foreground: "oklch(0.16 0.028 265)",
      primary: "oklch(0.22 0.05 264)",
    },
    dark: {
      background: "oklch(0.15 0.004 260)",
      foreground: "oklch(0.97 0.004 260)",
      primary: "oklch(0.92 0.004 260)",
    }
  },
  candy: {
    light: {
      background: "oklch(0.99 0.005 300)",
      foreground: "oklch(0.20 0.04 300)",
      primary: "oklch(0.55 0.22 295)",
    },
    dark: {
      background: "oklch(0.12 0.01 300)",
      foreground: "oklch(0.98 0.005 300)",
      primary: "oklch(0.70 0.18 295)",
    }
  },
  rainforest: {
    light: {
      background: "oklch(0.99 0.005 150)",
      foreground: "oklch(0.18 0.03 150)",
      primary: "oklch(0.52 0.16 150)",
    },
    dark: {
      background: "oklch(0.12 0.01 150)",
      foreground: "oklch(0.98 0.005 150)",
      primary: "oklch(0.65 0.15 150)",
    }
  },
  sea: {
    light: {
      background: "oklch(0.99 0.005 220)",
      foreground: "oklch(0.18 0.03 220)",
      primary: "oklch(0.55 0.15 220)",
    },
    dark: {
      background: "oklch(0.12 0.01 220)",
      foreground: "oklch(0.98 0.005 220)",
      primary: "oklch(0.65 0.15 220)",
    }
  },
  sunset: {
    light: {
      background: "oklch(0.99 0.005 45)",
      foreground: "oklch(0.20 0.04 45)",
      primary: "oklch(0.60 0.20 45)",
    },
    dark: {
      background: "oklch(0.12 0.01 45)",
      foreground: "oklch(0.98 0.005 45)",
      primary: "oklch(0.75 0.18 45)",
    }
  }
};

export const FONT_CLASSES = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
  jakarta: "font-sans tracking-tight",
};

export const RADIUS_VALUES = {
  pill: "9999px",
  rounded: "0.75rem",
  square: "0px",
};

export function ThemeStyleWrapper({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const siteMode = user.site_mode || "system";

  useEffect(() => {
    if (siteMode === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else if (siteMode === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      // System
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(mediaQuery.matches);
      if (mediaQuery.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [siteMode]);

  // Determine active palette
  let activeBg = "";
  let activeFg = "";
  let activePrimary = "";

  if (user.color_theme === "custom" && user.custom_color) {
    // Custom hex implies we keep the base background/foreground, but override primary
    const baseObj = isDarkMode ? COLOR_PALETTES.base.dark : COLOR_PALETTES.base.light;
    activeBg = baseObj.background;
    activeFg = baseObj.foreground;
    // We would need to convert hex to oklch ideally, but for now we can just inject the hex directly
    // Custom color mapping in CSS var:
    activePrimary = user.custom_color;
  } else {
    const paletteKey = (user.color_theme as keyof typeof COLOR_PALETTES) || "base";
    const palette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.base;
    const modeObj = isDarkMode ? palette.dark : palette.light;
    activeBg = modeObj.background;
    activeFg = modeObj.foreground;
    activePrimary = modeObj.primary;
  }

  const radius = RADIUS_VALUES[(user.button_style as keyof typeof RADIUS_VALUES) || "rounded"];
  const fontClass = FONT_CLASSES[(user.font_family as keyof typeof FONT_CLASSES) || "sans"];

  return (
    <div
      className={fontClass}
      style={{
        "--background": activeBg,
        "--foreground": activeFg,
        "--primary": activePrimary,
        "--radius": radius,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
