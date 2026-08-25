"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeModeSelector } from "@/components/theme-mode-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CircleUser,
  CreditCard,
  CircleHelp,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";

export function SidebarAccountDropdown({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-3 border-t border-sidebar-border/70">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  const displayName = user?.name || "Account";

  return (
    <div className="shrink-0 border-t border-sidebar-border/70 bg-background p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg px-2.5 hover:bg-sidebar-accent/50 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground leading-tight">
                {displayName}
              </p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
                  {user.email}
                </p>
              ) : null}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56 p-1.5 shadow-lg">
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/profile"
              onClick={() => onNavigate?.()}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer text-sm font-medium"
            >
              <CircleUser className="h-4 w-4 shrink-0 opacity-80" />
              Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/billing"
              onClick={() => onNavigate?.()}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer text-sm font-medium"
            >
              <CreditCard className="h-4 w-4 shrink-0 opacity-80" />
              Billings and Plans
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/support"
              onClick={() => onNavigate?.()}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer text-sm font-medium"
            >
              <CircleHelp className="h-4 w-4 shrink-0 opacity-80" />
              Support
            </Link>
          </DropdownMenuItem>

          <ThemeModeSelector />

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              onNavigate?.();
              logout();
            }}
            className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer text-sm font-medium text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
