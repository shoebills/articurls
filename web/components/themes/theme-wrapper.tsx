"use client";

import React, { useEffect } from "react";
import { useTheme } from "next-themes";
import type { PublicUser } from "@/lib/types";

// The 5 curated presets with complete light and dark tokens
export const COLOR_PALETTES = {
  base: {
    light: {
      background: "oklch(0.985 0.004 260)",
      foreground: "oklch(0.16 0.028 265)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.16 0.028 265)",
      primary: "oklch(0.22 0.05 264)",
      primaryForeground: "oklch(0.99 0.002 260)",
      muted: "oklch(0.965 0.01 260)",
      mutedForeground: "oklch(0.46 0.022 260)",
      border: "oklch(0.905 0.014 260)",
      ring: "oklch(0.55 0.02 260)",
    },
    dark: {
      background: "oklch(0.14 0.004 260)",
      foreground: "oklch(0.97 0.004 260)",
      card: "oklch(0.18 0.006 260)",
      cardForeground: "oklch(0.97 0.004 260)",
      primary: "oklch(0.92 0.004 260)",
      primaryForeground: "oklch(0.20 0.05 264)",
      muted: "oklch(0.22 0.008 260)",
      mutedForeground: "oklch(0.64 0.02 260)",
      border: "oklch(0.26 0.008 260)",
      ring: "oklch(0.55 0.02 260)",
    },
  },
  candy: {
    light: {
      background: "oklch(0.99 0.005 320)",
      foreground: "oklch(0.18 0.03 320)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.18 0.03 320)",
      primary: "oklch(0.55 0.22 320)",
      primaryForeground: "oklch(0.99 0 0)",
      muted: "oklch(0.965 0.012 320)",
      mutedForeground: "oklch(0.48 0.04 320)",
      border: "oklch(0.91 0.018 320)",
      ring: "oklch(0.55 0.22 320)",
    },
    dark: {
      background: "oklch(0.13 0.012 320)",
      foreground: "oklch(0.98 0.005 320)",
      card: "oklch(0.17 0.018 320)",
      cardForeground: "oklch(0.98 0.005 320)",
      primary: "oklch(0.72 0.19 320)",
      primaryForeground: "oklch(0.15 0.03 320)",
      muted: "oklch(0.21 0.015 320)",
      mutedForeground: "oklch(0.68 0.03 320)",
      border: "oklch(0.26 0.018 320)",
      ring: "oklch(0.72 0.19 320)",
    },
  },
  rainforest: {
    light: {
      background: "oklch(0.99 0.005 150)",
      foreground: "oklch(0.18 0.03 150)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.18 0.03 150)",
      primary: "oklch(0.52 0.16 150)",
      primaryForeground: "oklch(0.99 0 0)",
      muted: "oklch(0.965 0.012 150)",
      mutedForeground: "oklch(0.46 0.03 150)",
      border: "oklch(0.91 0.018 150)",
      ring: "oklch(0.52 0.16 150)",
    },
    dark: {
      background: "oklch(0.13 0.012 150)",
      foreground: "oklch(0.98 0.005 150)",
      card: "oklch(0.17 0.016 150)",
      cardForeground: "oklch(0.98 0.005 150)",
      primary: "oklch(0.68 0.16 150)",
      primaryForeground: "oklch(0.14 0.03 150)",
      muted: "oklch(0.21 0.015 150)",
      mutedForeground: "oklch(0.66 0.03 150)",
      border: "oklch(0.26 0.018 150)",
      ring: "oklch(0.68 0.16 150)",
    },
  },
  sea: {
    light: {
      background: "oklch(0.99 0.005 225)",
      foreground: "oklch(0.18 0.03 225)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.18 0.03 225)",
      primary: "oklch(0.52 0.16 225)",
      primaryForeground: "oklch(0.99 0 0)",
      muted: "oklch(0.965 0.012 225)",
      mutedForeground: "oklch(0.46 0.03 225)",
      border: "oklch(0.91 0.018 225)",
      ring: "oklch(0.52 0.16 225)",
    },
    dark: {
      background: "oklch(0.13 0.012 225)",
      foreground: "oklch(0.98 0.005 225)",
      card: "oklch(0.17 0.016 225)",
      cardForeground: "oklch(0.98 0.005 225)",
      primary: "oklch(0.68 0.15 225)",
      primaryForeground: "oklch(0.14 0.03 225)",
      muted: "oklch(0.21 0.015 225)",
      mutedForeground: "oklch(0.66 0.03 225)",
      border: "oklch(0.26 0.018 225)",
      ring: "oklch(0.68 0.15 225)",
    },
  },
  sunset: {
    light: {
      background: "oklch(0.99 0.005 45)",
      foreground: "oklch(0.18 0.03 45)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.18 0.03 45)",
      primary: "oklch(0.58 0.19 45)",
      primaryForeground: "oklch(0.99 0 0)",
      muted: "oklch(0.965 0.012 45)",
      mutedForeground: "oklch(0.46 0.03 45)",
      border: "oklch(0.91 0.018 45)",
      ring: "oklch(0.58 0.19 45)",
    },
    dark: {
      background: "oklch(0.13 0.012 45)",
      foreground: "oklch(0.98 0.005 45)",
      card: "oklch(0.17 0.016 45)",
      cardForeground: "oklch(0.98 0.005 45)",
      primary: "oklch(0.72 0.17 45)",
      primaryForeground: "oklch(0.15 0.03 45)",
      muted: "oklch(0.21 0.015 45)",
      mutedForeground: "oklch(0.66 0.03 45)",
      border: "oklch(0.26 0.018 45)",
      ring: "oklch(0.72 0.17 45)",
    },
  },
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

function getPaletteTokens(colorTheme?: string | null, customColor?: string | null) {
  if (colorTheme === "custom" && customColor) {
    const baseLight = COLOR_PALETTES.base.light;
    const baseDark = COLOR_PALETTES.base.dark;
    return {
      light: {
        ...baseLight,
        primary: customColor,
        primaryForeground: "#ffffff",
        ring: customColor,
      },
      dark: {
        ...baseDark,
        primary: customColor,
        primaryForeground: "#ffffff",
        ring: customColor,
      },
    };
  }
  const key = (colorTheme as keyof typeof COLOR_PALETTES) || "base";
  return COLOR_PALETTES[key] || COLOR_PALETTES.base;
}

export function ThemeStyleWrapper({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const siteMode = user.site_mode || "system";

  useEffect(() => {
    // If reader hasn't explicitly chosen a mode in localStorage, apply site's configured mode
    const stored = typeof window !== "undefined" ? localStorage.getItem("blog-theme") : null;
    if (!stored) {
      setTheme(siteMode);
    }
  }, [siteMode, setTheme]);

  const palette = getPaletteTokens(user.color_theme, user.custom_color);
  const radius = RADIUS_VALUES[(user.button_style as keyof typeof RADIUS_VALUES) || "rounded"];
  const fontClass = FONT_CLASSES[(user.font_family as keyof typeof FONT_CLASSES) || "sans"];

  const cssContent = `
    :root, .articurls-theme-scope {
      --background: ${palette.light.background};
      --foreground: ${palette.light.foreground};
      --card: ${palette.light.card};
      --card-foreground: ${palette.light.cardForeground};
      --popover: ${palette.light.card};
      --popover-foreground: ${palette.light.cardForeground};
      --primary: ${palette.light.primary};
      --primary-foreground: ${palette.light.primaryForeground};
      --muted: ${palette.light.muted};
      --muted-foreground: ${palette.light.mutedForeground};
      --border: ${palette.light.border};
      --input: ${palette.light.border};
      --ring: ${palette.light.ring};
      --radius: ${radius};
    }

    .dark, .dark .articurls-theme-scope, .articurls-theme-scope.dark {
      --background: ${palette.dark.background};
      --foreground: ${palette.dark.foreground};
      --card: ${palette.dark.card};
      --card-foreground: ${palette.dark.cardForeground};
      --popover: ${palette.dark.card};
      --popover-foreground: ${palette.dark.cardForeground};
      --primary: ${palette.dark.primary};
      --primary-foreground: ${palette.dark.primaryForeground};
      --muted: ${palette.dark.muted};
      --muted-foreground: ${palette.dark.mutedForeground};
      --border: ${palette.dark.border};
      --input: ${palette.dark.border};
      --ring: ${palette.dark.ring};
    }
  `;

  return (
    <div className={`articurls-theme-scope min-h-screen bg-background text-foreground ${fontClass}`}>
      <style id="articurls-theme-vars" dangerouslySetInnerHTML={{ __html: cssContent }} />
      {user.custom_css ? (
        <style id="articurls-custom-css" dangerouslySetInnerHTML={{ __html: user.custom_css }} />
      ) : null}
      {user.custom_head_code ? (
        <div id="articurls-custom-head" dangerouslySetInnerHTML={{ __html: user.custom_head_code }} style={{ display: "none" }} />
      ) : null}
      {children}
      {user.custom_body_code ? (
        <div id="articurls-custom-body" dangerouslySetInnerHTML={{ __html: user.custom_body_code }} style={{ display: "none" }} />
      ) : null}
    </div>
  );
}
