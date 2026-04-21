"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { appAuthHref } from "@/lib/env";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const signupFree = appAuthHref("/signup?plan_choice=free");
  const login = appAuthHref("/login");

  const mobileLinks = (
    <nav className="flex flex-col gap-1 p-2">
      <a
        href="#features"
        className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Features
      </a>
      <a
        href="#proof"
        className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Social proof
      </a>
      <a
        href="#pricing"
        className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Pricing
      </a>
      <Link
        href={login}
        className="flex min-h-12 items-center rounded-lg px-4 text-base font-medium text-foreground transition-colors duration-200 hover:bg-muted active:bg-muted/80"
        onClick={() => setOpen(false)}
      >
        Log in
      </Link>
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 pt-[env(safe-area-inset-top)] shadow-sm shadow-black/[0.02] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,backdrop-filter] duration-200 supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-[max(1rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:h-16 sm:gap-3 sm:px-6 sm:pr-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 touch-manipulation md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <BrandLogo className="min-w-0" />
        </div>

        <div className="flex shrink-0 items-center gap-2 min-[400px]:gap-3 sm:gap-5 md:gap-6 lg:gap-8">
          <nav className="hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex lg:gap-8">
            <a href="#features" className="transition-colors duration-200 hover:text-foreground">
              Features
            </a>
            <a href="#proof" className="transition-colors duration-200 hover:text-foreground">
              Social proof
            </a>
            <a href="#pricing" className="transition-colors duration-200 hover:text-foreground">
              Pricing
            </a>
            <Link href={login} className="transition-colors duration-200 hover:text-foreground">
              Log in
            </Link>
          </nav>
          <Button size="sm" className="h-10 min-w-[6.5rem] touch-manipulation sm:min-w-0" asChild>
            <a href={signupFree}>Get started</a>
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Site menu</SheetTitle>
          <div className="border-b border-border px-4 py-4 pr-12">
            <BrandLogo size="sm" />
          </div>
          {mobileLinks}
          <div className="mt-4 border-t border-border p-4 pr-12">
            <Button className="h-11 w-full touch-manipulation" asChild>
              <a href={signupFree} onClick={() => setOpen(false)}>
                Get started — free
              </a>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
