"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, Zap } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { MARKETING_ORIGIN } from "@/lib/env";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, isPro } = useAuth();
  const mobileHeaderRef = useRef<HTMLElement | null>(null);
  const mobileMenuId = useId();
  const publicBlogHref =
    user?.custom_domain && (user.domain_status === "active" || user.domain_status === "grace")
      ? `https://${user.custom_domain}`
      : user?.user_name
        ? `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}`
        : null;

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
    <div className="flex min-h-dvh w-full bg-white md:justify-center">
      <div className="flex w-full max-w-[1200px]">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 hidden h-14 shrink-0 items-center justify-end border-b border-border/70 bg-white px-8 md:flex">
          <div className="flex items-center gap-2">
            {!isPro && (
              <Button asChild size="sm" className="h-8 rounded-md bg-foreground text-background hover:bg-foreground/90">
                <Link href="/dashboard/billing?plan=pro">
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade
                </Link>
              </Button>
            )}
            {publicBlogHref ? (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-md text-slate-700">
                <Link href={publicBlogHref}>
                  Visit blog
                </Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-slate-600">
                Visit blog
              </Button>
            )}
          </div>
        </header>
        <header
          ref={mobileHeaderRef}
          className="relative sticky top-0 z-30 min-h-14 shrink-0 border-b border-border bg-white pt-[max(0.5rem,env(safe-area-inset-top))] [--mobile-nav-rail-gap:0.5rem] md:hidden"
        >
          <div className="px-3 pt-2 pb-[var(--mobile-nav-rail-gap)]">
            <div className="relative w-full">
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 min-h-10 min-w-10 shrink-0 border-border/70 bg-white text-muted-foreground shadow-md shadow-black/10 touch-manipulation hover:bg-white hover:text-foreground"
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
                {!isPro && (
                  <Button asChild size="icon" className="h-8 w-8 shrink-0 rounded-md bg-foreground text-background hover:bg-foreground/90">
                    <Link href="/dashboard/billing?plan=pro">
                      <Zap className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                {publicBlogHref ? (
                  <Button asChild variant="outline" size="sm" className="h-8 min-h-0 shrink-0 rounded-md text-slate-700">
                    <Link href={publicBlogHref}>
                      Visit blog
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="h-8 min-h-0 shrink-0 rounded-md text-slate-600">
                    Visit blog
                  </Button>
                )}
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
                <div className="max-h-[min(72dvh,28rem)] overflow-hidden rounded-xl border border-border/80 bg-white">
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
              className="pointer-events-auto fixed inset-x-0 top-14 z-20 bg-transparent md:hidden"
              style={{ height: "calc(100dvh - 3.5rem)" }}
              aria-hidden
              onClick={close}
            />
          ) : null}
        </header>

        <main className="flex-1 touch-pan-y bg-white px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:px-5 sm:py-6 md:p-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  </div>
  );
}
