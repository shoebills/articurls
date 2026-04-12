"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full md:h-dvh md:max-h-dvh md:overflow-hidden">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 touch-manipulation"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/dashboard"
            className="min-w-0 truncate font-semibold tracking-tight transition-opacity duration-200 hover:opacity-80"
          >
            Articurls
          </Link>
        </header>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">App navigation</SheetTitle>
            <DashboardSidebarPanel onNavigate={() => setOpen(false)} className="pr-10" />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-background via-background to-muted/20 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:py-6 md:min-h-0 md:p-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
