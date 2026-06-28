"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useSearch } from "@/components/search-context";
import { Input } from "@/components/ui/input";

const TRAY_GAP_PX = 8;
const TRAY_WIDTH_PX = 320;

export function SearchButton({
  iconClassName,
  trayClassName,
}: {
  iconClassName?: string;
  trayClassName?: string;
}) {
  const { query, setQuery } = useSearch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [trayLayout, setTrayLayout] = useState<{
    bottom: number;
    right: number;
    windowWidth: number;
  } | null>(null);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root || !open) return;
    const rootBox = root.getBoundingClientRect();
    setTrayLayout({
      bottom: rootBox.bottom,
      right: rootBox.right,
      windowWidth: window.innerWidth,
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTrayLayout(null);
      return;
    }
    const timer = requestAnimationFrame(() => measure());
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true });
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (target instanceof Element && target.closest('[role="dialog"]')) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Search posts"
        onClick={() => setOpen((prev) => !prev)}
        className={
          iconClassName ??
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:bg-white hover:text-foreground"
        }
      >
        <Search className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={
            trayClassName ??
            "fixed z-50 overflow-hidden rounded-xl border border-border/80 bg-white shadow-lg transition-opacity duration-200 ease-out"
          }
          style={
            trayLayout
              ? {
                  top: trayLayout.bottom + TRAY_GAP_PX,
                  right: trayLayout.windowWidth - trayLayout.right,
                  width: Math.min(TRAY_WIDTH_PX, trayLayout.windowWidth - 32),
                }
              : undefined
          }
          role="dialog"
          aria-label="Search posts"
        >
          <div className="p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts"
                aria-label="Search posts"
                className="h-10 min-h-10 rounded-lg border-border/80 !bg-white pl-9"
                autoFocus
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
