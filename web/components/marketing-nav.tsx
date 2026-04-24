"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { appAuthHref } from "@/lib/env";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const signupFree = appAuthHref("/signup?plan_choice=free");
  const login = appAuthHref("/login");

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (!navRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
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

  const mobileLinks = (
    <nav className="flex flex-col gap-1 p-2">
      <a
        href="#features"
        className="flex min-h-12 items-center justify-center rounded-lg px-4 text-center text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Features
      </a>
      <a
        href="#how-it-works"
        className="flex min-h-12 items-center justify-center rounded-lg px-4 text-center text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        How it works
      </a>
      <a
        href="#pricing"
        className="flex min-h-12 items-center justify-center rounded-lg px-4 text-center text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Pricing
      </a>
      <Link
        href={login}
        className="flex min-h-12 items-center justify-center rounded-lg px-4 text-center text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Log in
      </Link>
    </nav>
  );

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] shadow-sm shadow-black/[0.02] [--mobile-nav-rail-gap:0.5rem] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,backdrop-filter] duration-200 supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto w-full max-w-6xl px-[max(1rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 sm:pr-6">
        <div className="flex min-h-11 w-full items-center gap-2 py-[var(--mobile-nav-rail-gap)] sm:h-16 sm:min-h-16 sm:gap-3 sm:py-0">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 sm:min-h-0 sm:gap-2">
            <BrandLogo className="min-w-0" />
          </div>

          <div className="flex shrink-0 items-center gap-2 min-[400px]:gap-3 sm:gap-5 md:gap-6 lg:gap-8">
            <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex lg:gap-8">
              <a href="#features" className="transition-colors duration-200 hover:text-foreground">
                Features
              </a>
              <a href="#how-it-works" className="transition-colors duration-200 hover:text-foreground">
                How it works
              </a>
              <a href="#pricing" className="transition-colors duration-200 hover:text-foreground">
                Pricing
              </a>
              <Link href={login} className="transition-colors duration-200 hover:text-foreground">
                Log in
              </Link>
            </nav>
            <Button size="sm" className="hidden h-10 min-w-[6.5rem] touch-manipulation md:inline-flex sm:min-w-0" asChild>
              <a href={signupFree}>Get started</a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 border-border/70 bg-background/95 text-muted-foreground shadow-md shadow-black/10 touch-manipulation hover:bg-background hover:text-foreground md:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-marketing-menu"
              onClick={() => setOpen((prev) => !prev)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      <div
        id="mobile-marketing-menu"
        className={`absolute inset-x-0 top-full z-30 mt-[calc(var(--mobile-nav-rail-gap)+1px+var(--mobile-nav-rail-gap))] md:hidden transition-all duration-250 ease-in-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 sm:pr-6">
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl shadow-black/10">
            {mobileLinks}
            <div className="border-t border-border p-3">
              <Button className="h-11 w-full touch-manipulation" asChild>
                <a href={signupFree} className="inline-flex w-full items-center justify-center text-center" onClick={() => setOpen(false)}>
                  Get started — free
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
