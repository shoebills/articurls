"use client";

import Link from "next/link";
import type { PublicBlog, PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicDesktopNav, PublicNavDesktopLink } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";

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
    <div className="min-h-screen bg-background text-foreground font-sans tracking-tight">
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
          <div className="mb-16 mt-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                <span className="text-primary block mb-2">{site.about_title || "Product Updates"}</span>
                {site.bio ? site.bio.split("\\n")[0] : "The latest news and resources."}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {site.bio && site.bio.split("\\n").length > 1 ? site.bio.split("\\n").slice(1).join(" ") : ""}
              </p>
              {showSubscriberCollection && (
                <div className="mt-8">
                  <SubscribeToAuthor userName={site.user_name} authorName={site.name} />
                </div>
              )}
            </div>
            <div className="hidden md:flex justify-end">
              <div className="w-full max-w-sm aspect-square bg-muted/40 rounded-3xl border border-border/80 flex items-center justify-center">
                 {/* Placeholder for SaaS hero graphic */}
                 <div className="w-24 h-24 rounded-2xl bg-primary/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Interactive Category Pills */}
        {categories.length > 0 && (
           <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40">
             <Link href="/" className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">
               All
             </Link>
             {categories.map((c) => (
               <Link key={c.category_id} href={`/category/${c.slug}`} className="px-4 py-1.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0">
                 {c.name}
               </Link>
             ))}
           </div>
        )}

        {/* Multi-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((b) => (
            <Link key={b.blog_id} href={`/blog/${b.slug}`} className="group flex flex-col h-full bg-card rounded-2xl border border-border/60 overflow-hidden hover:border-primary/50 transition-colors shadow-xs hover:shadow-sm">
              <div className="aspect-[16/9] w-full bg-muted flex items-center justify-center overflow-hidden">
                {/* Image placeholder since we don't have direct access to image loader here easily without refactoring */}
                <div className="w-full h-full bg-primary/5 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center text-primary/30">
                  Image
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                {b.category_ids && b.category_ids.length > 0 && categories.find(c => c.category_id === b.category_ids![0]) && (
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                      {categories.find(c => c.category_id === b.category_ids![0])?.name}
                    </span>
                )}
                <h3 className="text-xl font-bold mb-3 line-clamp-2">{b.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">{b.excerpt}</p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                  <span>{site.name}</span>
                  {b.published_at && (
                    <time dateTime={b.published_at}>
                      {new Date(b.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </time>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <PublicSiteFooter user={site} pages={pages} />
      </main>
    </div>
  );
}
