"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { TrialExpiredPopup } from "@/components/trial-expired-overlay";
import { useAuth } from "@/lib/auth-context";
import { UGC_DOMAIN } from "@/lib/env";
import { getSitePublicRoot } from "@/lib/public-url";
import { cn } from "@/lib/utils";

// The popup must never block the pages a user needs to actually pay or ask
// for help — those routes stay usable.
const POPUP_EXEMPT_PREFIXES = ["/dashboard/billing", "/dashboard/support"];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, activeSite, isPro, subscription, loading } = useAuth();
  const mobileHeaderRef = useRef<HTMLElement | null>(null);
  const mobileMenuId = useId();
  const publicBlogHref = activeSite
    ? getSitePublicRoot(activeSite)
    : user?.custom_domain && (user.domain_status === "active" || user.domain_status === "grace")
      ? `https://${user.custom_domain}`
      : user?.subdomain
        ? `https://${encodeURIComponent(user.subdomain)}.${UGC_DOMAIN}`
        : null;

  const isLocked = !isPro && !!subscription && !loading;
  const isPopupExempt = POPUP_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const showTrialPopup = isLocked && !isPopupExempt;

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
    const onDown = (e: PointerEvent) => {
      // Layered dismissal: while a dropdown menu or dialog is open, never
      // auto-close the tray. Radix portals render outside the header and flip
      // body pointer-events while open, so hit-testing can't distinguish tray
      // taps from page taps — the topmost layer owns dismissal, and its item
      // actions close the tray via onNavigate.
      if (document.querySelector('[role="menu"], [role="dialog"]')) return;
      const t = e.target as Node | null;
      if (t && mobileHeaderRef.current && !mobileHeaderRef.current.contains(t)) {
        close();
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  return (
    <div className="flex min-h-dvh w-full bg-background md:justify-center">
      <div className="flex w-full max-w-[1200px] flex-col">
        <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between border-b border-border/70 bg-background px-3 md:flex">
          <BrandLogo href="/dashboard" showIcon={false} />
          <div className="flex items-center gap-2">
            {publicBlogHref ? (
              <Button asChild variant="outline" size="sm" className="h-8 rounded-md text-foreground">
                <a href={publicBlogHref} target="_blank" rel="noopener noreferrer">
                  Visit blog
                </a>
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-muted-foreground">
                Visit blog
              </Button>
            )}
          </div>
        </header>
        <div className="flex min-h-0 w-full flex-1">
          <AppSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          ref={mobileHeaderRef}
          className="relative sticky top-0 z-30 min-h-14 shrink-0 border-b border-border/70 bg-background pt-[max(0.5rem,env(safe-area-inset-top))] [--mobile-nav-rail-gap:0.5rem] md:hidden"
        >
          <div className="px-3 pt-2 pb-[var(--mobile-nav-rail-gap)]">
            <div className="relative w-full">
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 min-h-10 min-w-10 shrink-0 border-border/70 bg-background text-muted-foreground shadow-md shadow-black/10 touch-manipulation hover:bg-muted hover:text-foreground"
                    aria-label="Open menu"
                    aria-expanded={open}
                    aria-controls={mobileMenuId}
                    onClick={() => setOpen((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <BrandLogo
                    href="/dashboard"
                    showIcon={false}
                    className="min-w-0 flex-1 [&>span]:min-w-0 [&>span]:truncate"
                    onClick={() => setOpen(false)}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {publicBlogHref ? (
                  <Button asChild variant="outline" size="sm" className="h-8 min-h-0 shrink-0 rounded-md text-foreground">
                    <a href={publicBlogHref} target="_blank" rel="noopener noreferrer">
                      Visit blog
                    </a>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="h-8 min-h-0 shrink-0 rounded-md text-muted-foreground">
                    Visit blog
                  </Button>
                )}
                </div>
              </div>

              <div
                id={mobileMenuId}
                className={cn(
                  "absolute left-0 top-full z-50 mt-[calc(var(--mobile-nav-rail-gap)+1px+var(--mobile-nav-rail-gap))] w-[80%] min-w-0 max-w-full transition-opacity duration-200 ease-out",
                  open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                aria-hidden={!open}
              >
                <div className="max-h-[min(72dvh,28rem)] overflow-hidden rounded-xl border border-border/80 bg-background">
                  <h2 className="sr-only">App navigation</h2>
                  <DashboardSidebarPanel
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

        <main className="relative flex-1 touch-pan-y bg-background px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 sm:px-5 sm:pb-6 sm:pt-8 md:p-8 md:pb-10">
          {children}
          {showTrialPopup ? <TrialExpiredPopup /> : null}
        </main>
        </div>
      </div>
    </div>
    </div>
  );
}
