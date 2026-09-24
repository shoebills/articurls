"use client";

import React, { useEffect } from "react";
import { useTheme } from "next-themes";
import type { ColorPalette, PublicSite } from "@/lib/types";
import { DEFAULT_PALETTES } from "./color-palette-picker";

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

export const FONT_STACKS: Record<string, string> = {
  sans: "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  jakarta: "var(--font-geist), ui-sans-serif, system-ui, sans-serif",
};

export const RADIUS_VALUES = {
  pill: "9999px",
  rounded: "0.5rem",
  square: "0px",
};

function getPaletteTokens(colorTheme?: string | null, customPalette?: ColorPalette | null) {
  const key = (colorTheme as keyof typeof COLOR_PALETTES) || "base";
  const defaultBase = COLOR_PALETTES[key] || COLOR_PALETTES.base;
  const defaultTokens = DEFAULT_PALETTES[key] || DEFAULT_PALETTES.base;

  if (customPalette && Object.keys(customPalette).length > 0) {
    return {
      light: {
        background: customPalette.background,
        foreground: customPalette.background_text,
        card: customPalette.background,
        cardForeground: customPalette.background_text,
        popover: customPalette.background,
        popoverForeground: customPalette.background_text,
        primary: customPalette.primary,
        primaryForeground: customPalette.primary_text,
        secondary: customPalette.secondary,
        secondaryForeground: customPalette.secondary_text,
        muted: customPalette.secondary,
        mutedForeground: `color-mix(in srgb, ${customPalette.background_text} 60%, transparent)`,
        border: `color-mix(in srgb, ${customPalette.background_text} 15%, transparent)`,
        input: `color-mix(in srgb, ${customPalette.background_text} 15%, transparent)`,
        ring: customPalette.primary,
        link: customPalette.link,
      },
      dark: {
        ...defaultBase.dark,
        primary: customPalette.primary,
        primaryForeground: customPalette.primary_text,
        secondary: customPalette.secondary,
        secondaryForeground: customPalette.secondary_text,
        input: defaultBase.dark.border,
        ring: customPalette.primary,
        link: customPalette.link,
      },
    };
  }

  return {
    light: {
      ...defaultBase.light,
      secondary: defaultTokens.secondary,
      secondaryForeground: defaultTokens.secondary_text,
      input: defaultBase.light.border,
      link: defaultTokens.link,
    },
    dark: {
      ...defaultBase.dark,
      secondary: "oklch(0.24 0.008 260)",
      secondaryForeground: "oklch(0.92 0.004 260)",
      input: defaultBase.dark.border,
      link: defaultTokens.link,
    },
  };
}

export function ThemeStyleWrapper({
  site,
  children,
}: {
  site: PublicSite;
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();
  const siteMode = site.site_mode || "system";

  useEffect(() => {
    // If reader hasn't explicitly chosen a mode in localStorage, apply site's configured mode
    const stored = typeof window !== "undefined" ? localStorage.getItem("blog-theme") : null;
    if (!stored) {
      setTheme(siteMode);
    }
  }, [siteMode, setTheme]);

  useEffect(() => {
    if (site.site_language) {
      document.documentElement.lang = site.site_language;
    }
    return () => {
      document.documentElement.lang = "en";
    };
  }, [site.site_language]);

  const palette = getPaletteTokens(site.color_theme, site.color_palette);
  const radius = RADIUS_VALUES[(site.button_style as keyof typeof RADIUS_VALUES) || "rounded"];

  const fontHeading = (site.font_heading as keyof typeof FONT_STACKS) || (site.font_family as keyof typeof FONT_STACKS) || "sans";
  const fontContent = (site.font_content as keyof typeof FONT_STACKS) || (site.font_family as keyof typeof FONT_STACKS) || "sans";
  const fontUi = (site.font_ui as keyof typeof FONT_STACKS) || (site.font_family as keyof typeof FONT_STACKS) || "sans";

  const headingStack = FONT_STACKS[fontHeading] || FONT_STACKS.sans;
  const contentStack = FONT_STACKS[fontContent] || FONT_STACKS.sans;
  const uiStack = FONT_STACKS[fontUi] || FONT_STACKS.sans;

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
      --secondary: ${palette.light.secondary};
      --secondary-foreground: ${palette.light.secondaryForeground};
      --muted: ${palette.light.muted};
      --muted-foreground: ${palette.light.mutedForeground};
      --border: ${palette.light.border};
      --input: ${palette.light.input || palette.light.border};
      --ring: ${palette.light.ring};
      --link: ${palette.light.link};
      --radius: ${radius};
      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --font-heading-family: ${headingStack};
      --font-content-family: ${contentStack};
      --font-ui-family: ${uiStack};
      font-family: var(--font-content-family);
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
      --secondary: ${palette.dark.secondary};
      --secondary-foreground: ${palette.dark.secondaryForeground};
      --muted: ${palette.dark.muted};
      --muted-foreground: ${palette.dark.mutedForeground};
      --border: ${palette.dark.border};
      --input: ${palette.dark.input || palette.dark.border};
      --ring: ${palette.dark.ring};
      --link: ${palette.dark.link};
      --radius: ${radius};
      --radius-sm: calc(var(--radius) - 4px);
      --radius-md: calc(var(--radius) - 2px);
      --radius-lg: var(--radius);
      --font-heading-family: ${headingStack};
      --font-content-family: ${contentStack};
      --font-ui-family: ${uiStack};
      font-family: var(--font-content-family);
    }

    .articurls-theme-scope h1,
    .articurls-theme-scope h2,
    .articurls-theme-scope h3,
    .articurls-theme-scope h4,
    .articurls-theme-scope h5,
    .articurls-theme-scope h6,
    .articurls-theme-scope .font-heading {
      font-family: var(--font-heading-family);
    }

    .articurls-theme-scope nav,
    .articurls-theme-scope header,
    .articurls-theme-scope button,
    .articurls-theme-scope .font-ui {
      font-family: var(--font-ui-family);
    }

    .articurls-theme-scope a:not([class*="btn"]):not([role="button"]):not([class*="button"]):not([data-no-link-color]):not([data-public-nav] a) {
      color: var(--link);
    }

    .articurls-theme-scope [data-button-radius] {
      border-radius: var(--radius) !important;
    }

    .articurls-theme-scope [data-button-variant="outline"] {
      border: 2px solid var(--primary) !important;
      background-color: transparent !important;
      color: var(--primary) !important;
    }
    .articurls-theme-scope [data-button-variant="outline"]:hover {
      background-color: color-mix(in srgb, var(--primary) 12%, transparent) !important;
    }

    .articurls-theme-scope [data-button-variant="soft"] {
      border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent) !important;
      background-color: color-mix(in srgb, var(--primary) 15%, transparent) !important;
      color: var(--primary) !important;
    }
    .articurls-theme-scope [data-button-variant="soft"]:hover {
      background-color: color-mix(in srgb, var(--primary) 25%, transparent) !important;
    }
  `;

  return (
    <div className="articurls-theme-scope min-h-screen bg-background text-foreground">
      <style id="articurls-theme-vars" dangerouslySetInnerHTML={{ __html: cssContent }} />
      {site.custom_css ? (
        <style id="articurls-custom-css" dangerouslySetInnerHTML={{ __html: site.custom_css }} />
      ) : null}
      {site.custom_head_code ? (
        <div id="articurls-custom-head" dangerouslySetInnerHTML={{ __html: site.custom_head_code }} style={{ display: "none" }} />
      ) : null}
      {children}
      {site.custom_body_code ? (
        <div id="articurls-custom-body" dangerouslySetInnerHTML={{ __html: site.custom_body_code }} style={{ display: "none" }} />
      ) : null}
    </div>
  );
}
