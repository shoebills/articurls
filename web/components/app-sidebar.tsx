"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LineChart,
  Settings,
  Files,
  Palette,
  Users,
  Tags,
  Gauge,
  UserCheck,
  Hourglass,
} from "lucide-react";
import { SiteSwitcher } from "@/components/site-switcher";
import { SidebarAccountDropdown } from "@/components/sidebar-account-dropdown";
import { useAuth } from "@/lib/auth-context";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/dashboard/posts", label: "Posts", icon: LayoutDashboard },
  { href: "/dashboard/pages", label: "Pages", icon: Files },
  { href: "/dashboard/categories", label: "Categories", icon: Tags },
  { href: "/dashboard/authors", label: "Authors", icon: UserCheck },
];

const advancedLinks = [
  { href: "/dashboard/audience", label: "Subscribers", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/themes", label: "Themes", icon: Palette },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

type PanelProps = {
  /** Close mobile sheet after navigation */
  onNavigate?: () => void;
  className?: string;
  /** Merged nav+footer with 20px above divider (mobile tray only); desktop keeps pinned footer */
  mobileTrayLayout?: boolean;
};

export function DashboardSidebarPanel({ onNavigate, className, mobileTrayLayout = false }: PanelProps) {
  const pathname = usePathname();
  const { isTrial, daysRemaining } = useAuth();

  const trialChip = isTrial ? (
    <Link
      href="/dashboard/billing?plan=pro"
      onClick={() => onNavigate?.()}
      className="mx-2.5 mb-1 flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50/70 px-2.5 py-2 text-xs font-medium leading-tight text-amber-900 transition-colors hover:bg-amber-50"
    >
      <Hourglass className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      {daysRemaining !== null && daysRemaining > 0
        ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left in trial`
        : "Trial ended — subscribe now"}
    </Link>
  ) : null;

  const renderNavLinks = (items: typeof primaryLinks) =>
    items.map(({ href, label, icon: Icon }) => {
      const active =
        href === "/dashboard"
          ? pathname === "/dashboard" || pathname === "/dashboard/"
          : pathname === href || pathname.startsWith(`${href}/`);
      return (
        <Link
          key={href}
          href={href}
          onClick={() => onNavigate?.()}
          className={cn(
            "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[15px] font-medium transition-[background-color,color] duration-200 active:bg-sidebar-accent/90",
            active
              ? "bg-sidebar-accent/80 text-sidebar-foreground font-semibold"
              : "text-muted-foreground hover:bg-sidebar-accent/45 hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          {label}
        </Link>
      );
    });

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Site Switcher */}
      <SiteSwitcher onNavigate={onNavigate} />

      {/* Trial countdown chip */}
      {trialChip}

      <div className={cn("flex min-h-0 flex-1 flex-col", mobileTrayLayout && "overflow-y-auto overscroll-contain")}>
        <nav className={cn("flex min-h-0 flex-col p-2.5 gap-5", !mobileTrayLayout && "flex-1 overflow-y-auto overscroll-contain")}>
          {/* Ungrouped Primary Links */}
          <div className="flex flex-col gap-1">
            {renderNavLinks(primaryLinks)}
          </div>

          {/* Advanced Section */}
          <div className="flex flex-col gap-1">
            <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
              Advanced
            </p>
            {renderNavLinks(advancedLinks)}
          </div>
        </nav>

        {/* Footer Account Dropdown: pinned to panel bottom on desktop;
            follows content with a capped 20px gap in the mobile tray */}
        {mobileTrayLayout ? (
          <div className="px-2.5 pb-2.5 pt-5">
            <SidebarAccountDropdown onNavigate={onNavigate} />
          </div>
        ) : (
          <SidebarAccountDropdown onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-[14.5rem] shrink-0 flex-col bg-background md:sticky md:top-16 md:self-start md:flex md:border-r md:border-border/70">
      <DashboardSidebarPanel />
    </aside>
  );
}

