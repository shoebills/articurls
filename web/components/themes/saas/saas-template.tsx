"use client";

import Link from "next/link";
import type { PublicBlog, PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicDesktopNav, PublicNavDesktopLink } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { getPublicCategoryUrl, getPublicPostUrl, getPublicProfileUrl } from "@/lib/public-url";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { resolveBlogCoverImage } from "@/lib/blog-images";

type SaasTemplateProps = {
  site: PublicUser;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  basePath: string;
};

export function SaasTemplate({ site, blogs, pages, categories, basePath }: SaasTemplateProps) {
  const navBlogName = (site.nav_blog_name || "").trim() || "My Blog";
  const blogNameSize = normalizeNavBlogNameSize(site.nav_blog_name_size);
  const maxWidth = site.content_width === "wide" ? "max-w-7xl" : "max-w-5xl";
  const mainSpacing = site.navbar_enabled
    ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
    : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

  const catLinks: PublicNavDesktopLink[] = categories.map((c) => ({
    href: getPublicCategoryUrl(site.user_name, c.slug, basePath),
    label: c.name,
  }));
  const showSubscriberCollection = site.subscriber_collection_enabled === true;
  const desktopLinks = site.nav_menu_enabled ? catLinks : [];
  const hasMobileNav = (site.nav_menu_enabled && categories.length > 0) || showSubscriberCollection || blogs.length > 0;

  const publicNavHeaderClass = "sticky top-0 z-40 mb-8 border-b border-border/70 bg-background/90 backdrop-blur-md pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className={mainSpacing}>
        {site.navbar_enabled ? (
          <header className={publicNavHeaderClass} data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={navBlogName}
                titleHref={getPublicProfileUrl(site.user_name, basePath)}
                nameSize={blogNameSize}
                links={desktopLinks}
                showSubscribe={showSubscriberCollection}
                userName={site.user_name}
                authorName={site.name}
              />
            </div>
            <div className="sm:hidden">
              <PublicMobileNavMenu
                title={navBlogName}
                titleHref={getPublicProfileUrl(site.user_name, basePath)}
                nameSize={blogNameSize}
                links={site.nav_menu_enabled ? catLinks : []}
                userName={site.user_name}
                authorName={site.name}
                showSubscribeAction={showSubscriberCollection}
                showMenuButton={hasMobileNav}
              />
            </div>
          </header>
        ) : null}

        {/* SaaS Split Hero */}
        {(site.about_title || site.bio) && site.show_about_section ? (
          <div className="mb-14 mt-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground">
                <span className="text-primary block mb-2">{site.about_title || "Product Updates"}</span>
                {site.bio ? site.bio.split("\n")[0] : "The latest news and resources."}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {site.bio && site.bio.split("\n").length > 1 ? site.bio.split("\n").slice(1).join(" ") : ""}
              </p>
              {showSubscriberCollection && (
                <div className="mt-8">
                  <SubscribeToAuthor userName={site.user_name} authorName={site.name} />
                </div>
              )}
            </div>
            <div className="hidden md:flex justify-end">
              <div className="w-full max-w-sm aspect-square bg-muted/30 rounded-3xl border border-border/80 flex items-center justify-center p-8">
                <div className="w-full h-full rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-1/3 rounded-full bg-primary/40" />
                    <div className="h-2 w-3/4 rounded-full bg-foreground/15" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-foreground/10" />
                    <div className="h-2 w-5/6 rounded-full bg-foreground/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Interactive Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40">
            <Link
              href={getPublicProfileUrl(site.user_name, basePath)}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category_id}
                href={getPublicCategoryUrl(site.user_name, c.slug, basePath)}
                className="px-4 py-1.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0"
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
              const postHref = getPublicPostUrl(site.user_name, b.slug, basePath);
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
                      <span>{site.name}</span>
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

        <PublicSiteFooter user={site} pages={pages} />
      </main>
    </div>
  );
}
