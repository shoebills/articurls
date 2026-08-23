"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LineChart,
  Settings,
  Files,
  Palette,
  Users,
  Tags,
  Home,
  UserCheck,
} from "lucide-react";
import { SiteSwitcher } from "@/components/site-switcher";
import { SidebarAccountDropdown } from "@/components/sidebar-account-dropdown";

const primaryLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
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
  /** Show logo + title row (desktop sidebar); hide for compact mobile tray */
  showBrand?: boolean;
  /** Merged nav+footer with 20px above divider (mobile tray only); desktop keeps pinned footer */
  mobileTrayLayout?: boolean;
};

export function DashboardSidebarPanel({ onNavigate, className, showBrand = true, mobileTrayLayout = false }: PanelProps) {
  const pathname = usePathname();

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
            "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-[background-color,color] duration-200 active:bg-sidebar-accent/90",
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
      {showBrand ? (
        <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border/70 bg-background px-3">
          <BrandLogo
            href="/dashboard"
            showIcon={false}
            className="min-w-0"
            onClick={() => onNavigate?.()}
          />
        </div>
      ) : null}

      {/* Site Switcher */}
      <SiteSwitcher onNavigate={onNavigate} />

      <div className="flex min-h-0 flex-1 flex-col md:border-r md:border-sidebar-border/70">
        <nav className="flex flex-1 flex-col overflow-y-auto overscroll-contain p-2.5 min-h-0 gap-5">
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

        {/* Footer Account Dropdown */}
        <SidebarAccountDropdown onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-dvh max-h-dvh w-[14.5rem] shrink-0 flex-col bg-background md:sticky md:top-0 md:self-start md:flex">
      <DashboardSidebarPanel />
    </aside>
  );
}

