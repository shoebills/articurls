"use client";

import Link from "next/link";
import type { PublicBlog, PublicSite, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicDesktopNav, PublicNavDesktopLink } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu, PublicMobileNavLink } from "@/components/public-mobile-nav-menu";
import { getPublicCategoryUrl, getPublicPostUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveBlogCoverImage } from "@/lib/blog-images";

type SaasTemplateProps = {
  site: PublicSite;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  basePath: string;
};

export function SaasTemplate({ site, blogs, pages, categories, basePath }: SaasTemplateProps) {
  const displayName = (site.site_name || "").trim() || site.name || site.subdomain || "My Blog";
  const titleHref = site.logo_link || getPublicProfileUrl(site.subdomain, basePath);
  const maxWidth = site.content_width === "wide" ? "max-w-7xl" : "max-w-5xl";
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = isNavEnabled
    ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
    : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

  const hasCustomNav = Array.isArray(site.nav_items) && site.nav_items.length > 0;

  const desktopLinks: PublicNavDesktopLink[] = hasCustomNav
    ? site.nav_items!.map((item) => ({
        href: item.url.startsWith("/") ? `${basePath}${item.url}` : item.url,
        label: item.label,
        is_cta: item.is_cta,
        open_in_new_tab: item.open_in_new_tab,
      }))
    : site.nav_menu_enabled !== false
      ? categories.map((c) => ({
          href: getPublicCategoryUrl(site.subdomain, c.slug, basePath),
          label: c.name,
        }))
      : [];

  const mobileLinks: PublicMobileNavLink[] = hasCustomNav
    ? site.nav_items!.map((item) => ({
        href: item.url.startsWith("/") ? `${basePath}${item.url}` : item.url,
        label: item.label,
        is_cta: item.is_cta,
        open_in_new_tab: item.open_in_new_tab,
      }))
    : site.nav_menu_enabled !== false
      ? categories.map((c) => ({
          href: getPublicCategoryUrl(site.subdomain, c.slug, basePath),
          label: c.name,
        }))
      : [];

  const hasMobileNav = desktopLinks.length > 0 || blogs.length > 0;

  const publicNavHeaderClass = site.navbar_style === "floating"
    ? "sticky top-4 z-40 mb-8 rounded-xl border border-border/70 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-sm"
    : site.navbar_style === "minimal"
      ? "sticky top-0 z-40 mb-8 bg-transparent pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6"
      : "sticky top-0 z-40 mb-8 border-b border-border/70 bg-background/90 backdrop-blur-md pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6";

  const hasHero = Boolean((site.hero_title || "").trim() || (site.hero_description || "").trim());

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className={mainSpacing}>
        {isNavEnabled ? (
          <header className={publicNavHeaderClass} data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={displayName}
                titleHref={titleHref}
                logoUrl={site.logo_url}
                searchEnabled={site.search_enabled !== false}
                links={desktopLinks}
                subdomain={site.subdomain}
                alignment={site.navbar_alignment || "left"}
              />
            </div>
            <div className="sm:hidden">
              <PublicMobileNavMenu
                title={displayName}
                titleHref={titleHref}
                logoUrl={site.logo_url}
                searchEnabled={site.search_enabled !== false}
                links={mobileLinks}
                subdomain={site.subdomain}
                showMenuButton={hasMobileNav}
              />
            </div>
          </header>
        ) : null}

        {/* SaaS Hero */}
        {hasHero ? (
          <div className="mb-14 mt-10 text-center max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground">
              {site.hero_title ? (
                <span className="text-primary block mb-2">{site.hero_title}</span>
              ) : null}
              {site.hero_description ? (
                <span className="text-xl sm:text-2xl font-normal text-muted-foreground block mt-3 leading-relaxed">
                  {site.hero_description}
                </span>
              ) : null}
            </h1>
            {site.newsletter_show_near_header ? (
              <div className="mt-8 max-w-md mx-auto">
                <SubscribeToAuthor
                  subdomain={site.subdomain}
                  headline={site.newsletter_headline}
                  text={site.newsletter_text}
                  disclaimer={site.newsletter_disclaimer}
                  buttonText={site.newsletter_button_text}
                />
              </div>
            ) : null}
          </div>
        ) : site.newsletter_show_near_header ? (
          <div className="my-10 max-w-md mx-auto">
            <SubscribeToAuthor
              subdomain={site.subdomain}
              headline={site.newsletter_headline}
              text={site.newsletter_text}
              disclaimer={site.newsletter_disclaimer}
              buttonText={site.newsletter_button_text}
            />
          </div>
        ) : null}

        {/* Interactive Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40">
            <Link
              href={getPublicProfileUrl(site.subdomain, basePath)}
              className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium shrink-0"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category_id}
                href={getPublicCategoryUrl(site.subdomain, c.slug, basePath)}
                className="px-4 py-1.5 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Multi-Column Grid */}
        {blogs.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-muted-foreground">No posts published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((b) => {
              const postHref = getPublicPostUrl(site.subdomain, b.slug, basePath);
              const coverImg = resolveBlogCoverImage(b);
              const firstCat = b.category_ids && b.category_ids.length > 0
                ? categories.find(c => c.category_id === b.category_ids![0])
                : null;

              return (
                <Link
                  key={b.blog_id}
                  href={postHref}
                  className="group flex flex-col h-full bg-card rounded-2xl border border-border/70 overflow-hidden hover:border-primary/50 transition-all shadow-2xs hover:shadow-sm"
                >
                  {coverImg ? (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImg}
                        alt={b.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                  <div className="p-6 flex flex-col flex-1">
                    {firstCat ? (
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                        {firstCat.name}
                      </span>
                    ) : null}
                    <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {b.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                      {b.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border/40">
                      <span>{b.author ? b.author.name : site.name}</span>
                      {b.published_at && (
                        <time dateTime={b.published_at}>
                          {new Date(b.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </time>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}
