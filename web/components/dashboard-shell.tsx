"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Menu } from "lucide-react";
import { AppSidebar, DashboardSidebarPanel } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

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
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-border/70 bg-background/95 text-muted-foreground shadow-md shadow-black/10 touch-manipulation hover:bg-background hover:text-foreground"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Link
              href="/dashboard"
              className="min-w-0 truncate text-lg font-semibold tracking-tight transition-opacity duration-200 hover:opacity-80"
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
        </header>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">App navigation</SheetTitle>
            <DashboardSidebarPanel onNavigate={() => setOpen(false)} className="pr-10" />
          </SheetContent>
        </Sheet>

        <main className="flex-1 touch-pan-y bg-[#f8fafc] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:py-6 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
