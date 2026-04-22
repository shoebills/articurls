"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Menu } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const mobileHeaderRef = useRef<HTMLElement | null>(null);
  const mobileMenuId = useId();

  const close = useCallback(() => setOpen(false), []);

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
          className="relative sticky top-0 z-30 min-h-14 shrink-0 border-b border-border bg-background pt-[max(0.5rem,env(safe-area-inset-top))] [--mobile-nav-rail-gap:0.5rem] md:hidden"
        >
          <div className="px-3 pt-2 pb-[var(--mobile-nav-rail-gap)]">
            <div className="relative w-full">
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
                  // Row→border and border→tray both use --mobile-nav-rail-gap (same as padding under row)
                  "absolute left-0 top-full z-50 mt-[calc(var(--mobile-nav-rail-gap)+1px+var(--mobile-nav-rail-gap))] w-[80%] min-w-0 max-w-full transition-opacity duration-200 ease-out",
                  open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                aria-hidden={!open}
              >
                <div className="max-h-[min(72dvh,28rem)] overflow-hidden rounded-xl border border-border/80 bg-sidebar">
                  <h2 className="sr-only">App navigation</h2>
                  <DashboardSidebarPanel
                    showBrand={false}
                    mobileTrayLayout
                    onNavigate={close}
                    className="!h-auto max-h-[min(72dvh,28rem)] min-h-0 pr-0 [&>div:last-child]:!min-h-0 [&>div:last-child]:!flex-1 [&>div:last-child]:!overflow-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
          {open ? (
            <div
              className="pointer-events-auto fixed left-0 right-0 top-14 z-20 bg-[#f8fafc]/85 md:hidden"
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
