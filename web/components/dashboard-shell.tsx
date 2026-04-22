"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Menu } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type TrayMetrics = { top: number; left: number; width: number };

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [trayMetrics, setTrayMetrics] = useState<TrayMetrics | null>(null);
  const { user } = useAuth();
  const mobileHeaderRef = useRef<HTMLElement | null>(null);
  const mobileNavRowRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuId = useId();

  const close = useCallback(() => setOpen(false), []);

  const measureMobileTray = useCallback(() => {
    const header = mobileHeaderRef.current;
    const row = mobileNavRowRef.current;
    if (!header || !row) return;
    const hb = header.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    setTrayMetrics({
      top: hb.bottom,
      left: rr.left,
      width: rr.width * 0.8,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setTrayMetrics(null);
      return;
    }
    measureMobileTray();
    const header = mobileHeaderRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measureMobileTray) : null;
    if (header && ro) ro.observe(header);
    window.addEventListener("resize", measureMobileTray);
    window.addEventListener("scroll", measureMobileTray, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measureMobileTray);
      window.removeEventListener("scroll", measureMobileTray, true);
    };
  }, [open, measureMobileTray]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (mobileHeaderRef.current && !mobileHeaderRef.current.contains(t)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  return (
    <div className="flex min-h-dvh w-full bg-[#f8fafc] md:h-dvh md:max-h-dvh md:overflow-hidden">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <header className="hidden h-14 shrink-0 items-center justify-end border-b border-border/70 bg-background/95 px-8 md:flex">
          <div className="flex items-center gap-2">
            {user?.user_name ? (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-md text-slate-700">
                <Link href={`/${user.user_name}`}>
                  <ExternalLink className="mr-0.75 h-3.5 w-3.5" />
                  Visit blog
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-slate-600">
                <ExternalLink className="mr-0.75 h-3.5 w-3.5" />
                Visit blog
              </Button>
            )}
          </div>
        </header>
        <header
          ref={mobileHeaderRef}
          className="relative sticky top-0 z-30 min-h-14 shrink-0 border-b border-border bg-background/90 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:hidden"
        >
          <div className="px-3 py-2">
            <div ref={mobileNavRowRef} className="relative w-full">
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-border/70 bg-background/95 text-muted-foreground shadow-md shadow-black/10 touch-manipulation hover:bg-background hover:text-foreground"
                    aria-label="Open menu"
                    aria-expanded={open}
                    aria-controls={mobileMenuId}
                    onClick={() => setOpen((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <Link
                    href="/dashboard"
                    className="min-w-0 truncate text-[1.6875rem] font-semibold tracking-tight transition-opacity duration-200 hover:opacity-80"
                    onClick={() => setOpen(false)}
                  >
                    Articurls
                  </Link>
                </div>
                {user?.user_name ? (
                  <Button asChild variant="outline" size="sm" className="h-9 shrink-0 rounded-md text-slate-700">
                    <Link href={`/${user.user_name}`}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Visit
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div
                id={mobileMenuId}
                className={cn(
                  "z-50 min-w-0 transition-all duration-200 ease-out",
                  open && trayMetrics
                    ? "fixed"
                    : "absolute left-0 top-full w-[80%] max-w-full",
                  open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                )}
                style={
                  open && trayMetrics
                    ? {
                        top: trayMetrics.top,
                        left: trayMetrics.left,
                        width: trayMetrics.width,
                        height: `calc(100dvh - ${trayMetrics.top}px - env(safe-area-inset-bottom, 0px))`,
                      }
                    : undefined
                }
                aria-hidden={!open}
              >
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-sidebar shadow-lg shadow-black/10">
                  <h2 className="sr-only">App navigation</h2>
                  <DashboardSidebarPanel
                    showBrand={false}
                    onNavigate={close}
                    className="!h-full min-h-0 pr-0 [&>div:last-child]:!min-h-0 [&>div:last-child]:!flex-1 [&>div:last-child]:!overflow-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
          {open ? (
            <div
              className="pointer-events-auto fixed left-0 right-0 top-14 z-20 bg-background/30 backdrop-blur-[1px] md:hidden"
              style={{ height: "calc(100dvh - 3.5rem)" }}
              aria-hidden
              onClick={close}
            />
          ) : null}
        </header>

        <main className="flex-1 touch-pan-y bg-[#f8fafc] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:py-6 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
