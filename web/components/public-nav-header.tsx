import type { PublicSite, Category } from "@/lib/types";
import { PublicDesktopNav, type PublicNavDesktopLink } from "./public-desktop-nav";
import { PublicMobileNavMenu } from "./public-mobile-nav-menu";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";

export function getPublicNavHeaderClass(navbarStyle?: string): string {
  if (navbarStyle === "floating") {
    return "sticky top-4 z-40 mb-8 sm:mb-10 w-full px-4 sm:px-6 pointer-events-none";
  }
  if (navbarStyle === "minimal") {
    return "sticky top-0 z-40 mb-8 sm:mb-10 w-full bg-transparent pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pb-5 sm:pt-6";
  }
  return "sticky top-0 z-40 mb-8 sm:mb-10 w-full border-b border-border/70 bg-background/90 backdrop-blur-md pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pb-5 sm:pt-6";
}

export function getPublicNavInnerClass(navbarStyle?: string, maxWidth = "max-w-7xl"): string {
  if (navbarStyle === "floating") {
    return `mx-auto ${maxWidth} rounded-xl border border-border/70 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-sm pointer-events-auto`;
  }
  return `mx-auto ${maxWidth} px-[26px] sm:px-6`;
}

export function getPublicMainSpacing(isNavEnabled: boolean, maxWidth = "max-w-7xl"): string {
  return isNavEnabled
    ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
    : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;
}

export function resolveNavLinks(
  site: PublicSite,
  categories: Category[] = [],
  basePath = ""
): PublicNavDesktopLink[] {
  const hasCustomNav = Array.isArray(site.nav_items) && site.nav_items.length > 0;
  if (hasCustomNav) {
    return site.nav_items!.map((item) => ({
      href: item.url.startsWith("/") ? `${basePath}${item.url}` : item.url,
      label: item.label,
      is_cta: item.is_cta,
      open_in_new_tab: item.open_in_new_tab,
    }));
  }
  if (site.nav_menu_enabled === false) return [];
  return categories.map((c) => ({
    href: getPublicCategoryUrl(site.subdomain, c.slug, basePath),
    label: c.name,
  }));
}

export interface PublicNavHeaderProps {
  site: PublicSite;
  categories?: Category[];
  basePath?: string;
  title?: string;
  titleHref?: string;
  links?: PublicNavDesktopLink[];
  hasBlogs?: boolean;
  maxWidth?: string;
}

export function PublicNavHeader({
  site,
  categories = [],
  basePath = "",
  title,
  titleHref,
  links,
  hasBlogs = false,
  maxWidth = "max-w-7xl",
}: PublicNavHeaderProps) {
  if (site.navbar_enabled === false) {
    return null;
  }

  const resolvedTitle = (title || "").trim() || (site.site_name || "").trim() || site.name || site.subdomain || "My Blog";
  const resolvedTitleHref = titleHref || getPublicProfileUrl(site.subdomain, basePath);
  const resolvedLinks = links || resolveNavLinks(site, categories, basePath);
  const hasMobileNav = resolvedLinks.length > 0 || hasBlogs;
  const buttonVariant = site.button_variant || "solid";

  return (
    <header className={getPublicNavHeaderClass(site.navbar_style)} data-public-nav>
      <div className={getPublicNavInnerClass(site.navbar_style, maxWidth)}>
        <div className="hidden w-full sm:block">
          <PublicDesktopNav
            title={resolvedTitle}
            titleHref={resolvedTitleHref}
            logoUrl={site.logo_url}
            searchEnabled={site.search_enabled !== false}
            themeToggleEnabled={site.theme_toggle_enabled !== false}
            links={resolvedLinks}
            subdomain={site.subdomain}
            alignment={site.navbar_alignment || "left"}
            basePath={basePath}
            buttonVariant={buttonVariant}
          />
        </div>
        <div className="sm:hidden">
          <PublicMobileNavMenu
            title={resolvedTitle}
            titleHref={resolvedTitleHref}
            logoUrl={site.logo_url}
            searchEnabled={site.search_enabled !== false}
            themeToggleEnabled={site.theme_toggle_enabled !== false}
            links={resolvedLinks}
            subdomain={site.subdomain}
            showMenuButton={hasMobileNav}
            basePath={basePath}
            buttonVariant={buttonVariant}
          />
        </div>
      </div>
    </header>
  );
}
