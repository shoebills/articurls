"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function ThemeModeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {MODES.map((m) => {
        const isSelected = mounted && theme === m.id;
        return (
          <button
            type="button"
            key={m.id}
            aria-label={m.label}
            title={m.label}
            onClick={() => setTheme(m.id)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center rounded-md border transition-all",
              isSelected
                ? "border-primary bg-primary/[0.03] text-primary ring-1 ring-primary/20"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <m.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}