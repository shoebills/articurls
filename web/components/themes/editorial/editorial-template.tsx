"use client";

import Link from "next/link";
import type { PublicBlog, PublicSite, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicDesktopNav, PublicNavDesktopLink } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu, PublicMobileNavLink } from "@/components/public-mobile-nav-menu";
import { getPublicCategoryUrl, getPublicPostUrl, getPublicProfileUrl, getPublicAuthorUrl } from "@/lib/public-url";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { resolveBlogCoverImage } from "@/lib/blog-images";

type EditorialTemplateProps = {
  site: PublicSite;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  basePath: string;
};

export function EditorialTemplate({ site, blogs, pages, categories, basePath }: EditorialTemplateProps) {
  const navBlogName = (site.nav_blog_name || "").trim() || site.name || site.subdomain || "My Blog";
  const blogNameSize = normalizeNavBlogNameSize(site.nav_blog_name_size);
  const maxWidth = site.content_width === "wide" ? "max-w-5xl" : "max-w-3xl";
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

  const showSubscriberCollection = site.subscriber_collection_enabled === true;
  const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection || blogs.length > 0;

  const publicNavHeaderClass = site.navbar_style === "floating"
    ? "sticky top-4 z-40 mb-12 rounded-full border border-border/70 bg-background/80 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-sm"
    : site.navbar_style === "minimal"
      ? "sticky top-0 z-40 mb-12 bg-transparent pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-16 sm:pb-5 sm:pt-6"
      : "sticky top-0 z-40 mb-12 border-b border-border/70 bg-background/80 backdrop-blur-md pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-16 sm:pb-5 sm:pt-6";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={mainSpacing}>
        {isNavEnabled ? (
          <header className={publicNavHeaderClass} data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={navBlogName}
                titleHref={getPublicProfileUrl(site.subdomain, basePath)}
                nameSize={blogNameSize}
                links={desktopLinks}
                showSubscribe={showSubscriberCollection}
                subdomain={site.subdomain}
                authorName={site.name}
                alignment={site.navbar_alignment || "left"}
              />
            </div>
            <div className="sm:hidden">
              <PublicMobileNavMenu
                title={navBlogName}
                titleHref={getPublicProfileUrl(site.subdomain, basePath)}
                nameSize={blogNameSize}
                links={mobileLinks}
                subdomain={site.subdomain}
                authorName={site.name}
                showSubscribeAction={showSubscriberCollection}
                showMenuButton={hasMobileNav}
              />
            </div>
          </header>
        ) : null}

        {/* Hero Section */}
        {site.about_title && site.show_about_section ? (
          <div className="mb-20 mt-16 text-center max-w-2xl mx-auto flex flex-col items-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl leading-tight">
              {site.about_title}
            </h1>
            {showSubscriberCollection && (
              <div className="mt-8 w-full max-w-sm">
                <SubscribeToAuthor subdomain={site.subdomain} authorName={site.name} />
              </div>
            )}
          </div>
        ) : null}

        {/* Linear Editorial Feed */}
        {blogs.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-base text-muted-foreground">No posts published yet.</p>
          </div>
        ) : (
          <div className="mt-12 space-y-16 lg:space-y-20">
            {blogs.map((b) => {
              const postHref = getPublicPostUrl(site.subdomain, b.slug, basePath);
              const coverImg = resolveBlogCoverImage(b);
              const firstCat = b.category_ids && b.category_ids.length > 0
                ? categories.find(c => c.category_id === b.category_ids![0])
                : null;

              return (
                <article key={b.blog_id} className="group relative flex flex-col items-start justify-between">
                  {coverImg ? (
                    <Link href={postHref} className="mb-6 block w-full overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverImg}
                        alt={b.title}
                        className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-102"
                        loading="lazy"
                      />
                    </Link>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    {b.author ? (
                      <Link
                        href={getPublicAuthorUrl(site.subdomain, b.author.slug, basePath)}
                        className="relative z-10 font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {b.author.name}
                      </Link>
                    ) : null}
                    {b.published_at && (
                      <time dateTime={b.published_at} className="text-muted-foreground">
                        {new Date(b.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </time>
                    )}
                    {firstCat && (
                      <Link
                        href={getPublicCategoryUrl(site.subdomain, firstCat.slug, basePath)}
                        className="relative z-10 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        {firstCat.name}
                      </Link>
                    )}
                  </div>
                  <div className="group relative">
                    <h3 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                      <Link href={postHref}>
                        <span className="absolute inset-0" />
                        {b.title}
                      </Link>
                    </h3>
                    <p className="mt-4 line-clamp-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {b.excerpt}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}
