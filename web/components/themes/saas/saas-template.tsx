"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicSite, UserPage, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  const maxWidth = "max-w-7xl";
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
    ? "sticky top-4 z-40 mb-12 rounded-xl border border-border/70 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-sm"
    : site.navbar_style === "minimal"
      ? "sticky top-0 z-40 mb-12 bg-transparent pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6"
      : "sticky top-0 z-40 mb-12 border-b border-border/70 bg-background/90 backdrop-blur-md pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6";

  const hasHero = Boolean((site.hero_title || "").trim() || (site.hero_description || "").trim());

  const [page, setPage] = useState(1);
  const postsPerPage = site.posts_per_page && site.posts_per_page >= 6 ? site.posts_per_page : 12;
  const paginationType = site.pagination_type || "prev_next";
  const isGrid = (site.content_layout || "grid") === "grid";
  const showPreview = site.show_preview_in_lists !== false;

  const sortedBlogs = useMemo(() => {
    const rows = [...blogs];
    rows.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    });
    return rows;
  }, [blogs]);

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / postsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;
    return sortedBlogs.slice(start, start + postsPerPage);
  }, [sortedBlogs, currentPage, postsPerPage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={mainSpacing}>
        {isNavEnabled ? (
          <header className={publicNavHeaderClass} data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={displayName}
                titleHref={titleHref}
                logoUrl={site.logo_url}
                searchEnabled={site.search_enabled !== false}
                themeToggleEnabled={site.theme_toggle_enabled !== false}
                links={desktopLinks}
                subdomain={site.subdomain}
                alignment={site.navbar_alignment || "left"}
                buttonVariant={site.button_variant || "solid"}
              />
            </div>
            <div className="sm:hidden">
              <PublicMobileNavMenu
                title={displayName}
                titleHref={titleHref}
                logoUrl={site.logo_url}
                searchEnabled={site.search_enabled !== false}
                themeToggleEnabled={site.theme_toggle_enabled !== false}
                links={mobileLinks}
                subdomain={site.subdomain}
                showMenuButton={hasMobileNav}
                buttonVariant={site.button_variant || "solid"}
              />
            </div>
          </header>
        ) : null}

        {/* SaaS Hero */}
        {hasHero ? (
          <>
            <div className="mb-20 mt-20 max-w-2xl text-left">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground text-left">
                {site.hero_title ? (
                  <span className="text-primary block mb-2 text-left">{site.hero_title}</span>
                ) : null}
                {site.hero_description ? (
                  <span className="text-xl sm:text-2xl font-normal text-muted-foreground block mt-3 leading-relaxed text-left">
                    {site.hero_description}
                  </span>
                ) : null}
              </h1>
            </div>
            {site.newsletter_show_near_header ? (
              <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 mt-8 mb-10">
                <div className="max-w-md mx-auto">
                  <SubscribeToAuthor
                    subdomain={site.subdomain}
                    headline={site.newsletter_headline}
                    text={site.newsletter_text}
                    disclaimer={site.newsletter_disclaimer}
                    buttonText={site.newsletter_button_text}
                    buttonVariant={site.button_variant || "solid"}
                    className="space-y-4 text-center"
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : site.newsletter_show_near_header ? (
          <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 my-10">
            <div className="max-w-md mx-auto">
              <SubscribeToAuthor
                subdomain={site.subdomain}
                headline={site.newsletter_headline}
                text={site.newsletter_text}
                disclaimer={site.newsletter_disclaimer}
                buttonText={site.newsletter_button_text}
                buttonVariant={site.button_variant || "solid"}
                className="space-y-4 text-center"
              />
            </div>
          </div>
        ) : null}

        {/* Interactive Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40">
            <Link
              href={getPublicProfileUrl(site.subdomain, basePath)}
              data-button-variant={site.button_variant || "solid"}
              data-button-radius="true"
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

        {/* Feed List */}
        {sortedBlogs.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-muted-foreground">No posts published yet.</p>
          </div>
        ) : isGrid ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pagedBlogs.map((b) => {
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
                    {showPreview && b.excerpt ? (
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                        {b.excerpt}
                      </p>
                    ) : null}

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
            {sortedBlogs.length > 0 ? (
              paginationType === "numbered" && totalPages > 1 ? (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={num === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 min-h-0 p-0 text-xs"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : (
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Page {currentPage} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )
            ) : null}
          </>
        ) : (
          <>
            <div className="space-y-0">
              {pagedBlogs.map((b) => {
              const postHref = getPublicPostUrl(site.subdomain, b.slug, basePath);
              const coverImg = resolveBlogCoverImage(b);
              const firstCat = b.category_ids && b.category_ids.length > 0
                ? categories.find(c => c.category_id === b.category_ids![0])
                : null;

              return (
                <Link
                  key={b.blog_id}
                  href={postHref}
                  className="group block py-6 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div className="min-w-0 flex-1">
                      {firstCat ? (
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 inline-block">
                          {firstCat.name}
                        </span>
                      ) : null}
                      <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                        {b.title}
                      </h3>
                      {showPreview && b.excerpt ? (
                        <p className="text-muted-foreground text-sm line-clamp-2 mt-2">
                          {b.excerpt}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                        <span className="truncate">{b.author ? b.author.name : site.name}</span>
                        {b.published_at && (
                          <time dateTime={b.published_at} className="shrink-0 ml-2">
                            {new Date(b.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </time>
                        )}
                      </div>
                    </div>
                    {coverImg ? (
                      <div className="shrink-0 w-24 sm:w-56">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImg}
                          alt={b.title}
                          className="aspect-[3/2] w-full object-cover rounded-md border border-border/70"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
            </div>
            {sortedBlogs.length > 0 ? (
              paginationType === "numbered" && totalPages > 1 ? (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={num === currentPage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 min-h-0 p-0 text-xs"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : (
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Page {currentPage} of {totalPages}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )
            ) : null}
          </>
        )}

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}
