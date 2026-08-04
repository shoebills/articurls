"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, LineChart, CreditCard, Settings, LogOut, Files, Palette, CircleUser, CircleHelp, Users, Tags } from "lucide-react";

const links = [
  { href: "/dashboard/posts", label: "Posts", icon: LayoutDashboard },
  { href: "/dashboard/pages", label: "Pages", icon: Files },
  { href: "/dashboard/categories", label: "Categories", icon: Tags },
  { href: "/dashboard/design", label: "Design", icon: Palette },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type PanelProps = {
  /** Close mobile sheet after navigation */
  onNavigate?: () => void;
  className?: string;
  /** Show logo + title row (desktop sidebar); hide for compact mobile tray */
  showBrand?: boolean;
  /** Merged nav+footer with 20px above divider (mobile tray only); desktop keeps pinned footer */
  mobileTrayLayout?: boolean;
};

export function DashboardSidebarPanel({ onNavigate, className, showBrand = true, mobileTrayLayout = false }: PanelProps) {
  const pathname = usePathname();
  const { logout, user, loading } = useAuth();

  const linkItems = links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => onNavigate?.()}
        className={cn(
          "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-[background-color,color] duration-200 active:bg-sidebar-accent/90",
          active
            ? "bg-sidebar-accent/80 text-sidebar-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        {label}
      </Link>
    );
  });

  const footer = (
    <div
      className={cn(
        "shrink-0 border-t border-sidebar-border/70 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        mobileTrayLayout && "mt-[20px] -mx-2.5"
      )}
    >
      <div className="mb-2 flex flex-col gap-1.5">
        <Link
          href="/dashboard/account"
          onClick={() => onNavigate?.()}
          className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-200 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
        >
          <CircleUser className="h-4 w-4 shrink-0 opacity-80" />
          Account
        </Link>
        <Link
          href="/dashboard/support"
          onClick={() => onNavigate?.()}
          className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-200 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
        >
          <CircleHelp className="h-4 w-4 shrink-0 opacity-80" />
          Support
        </Link>
      </div>
      {loading ? (
        <Skeleton className="mb-0.5 h-3 w-32" />
      ) : (
        <p className="truncate px-1 text-xs text-muted-foreground">{user?.email}</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-10 w-full justify-start gap-2 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9"
        onClick={() => {
          onNavigate?.();
          logout();
        }}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {showBrand ? (
          <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border/70 bg-white px-3">
          <BrandLogo
            href="/dashboard"
            className="min-w-0"
            onClick={() => onNavigate?.()}
          />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col md:border-r md:border-sidebar-border/70">
        {mobileTrayLayout ? (
          <nav className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain p-2.5">
            <div className="flex flex-col gap-1">{linkItems}</div>
            {footer}
          </nav>
        ) : (
          <>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-2.5 min-h-0">{linkItems}</nav>
            {footer}
          </>
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-dvh max-h-dvh w-[14.25rem] shrink-0 flex-col bg-white md:sticky md:top-0 md:self-start md:flex">
      <DashboardSidebarPanel />
    </aside>
  );
}
