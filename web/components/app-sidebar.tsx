"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LineChart, CreditCard, Settings, LogOut } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Posts", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type PanelProps = {
  /** Close mobile sheet after navigation */
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebarPanel({ onNavigate, className }: PanelProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar/80 px-3">
        <BrandLogo
          href="/dashboard"
          size="sm"
          className="min-w-0"
          onClick={() => onNavigate?.()}
        />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard" || pathname.startsWith("/dashboard/posts")
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 active:bg-sidebar-accent/90",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border/80"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-80" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border bg-sidebar/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <p className="truncate px-1 text-xs text-muted-foreground">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-11 w-full justify-start gap-2 sm:h-9"
          onClick={() => {
            onNavigate?.();
            logout();
          }}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-dvh max-h-dvh w-[15.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:self-start md:flex">
      <DashboardSidebarPanel />
    </aside>
  );
}
