import type { PublicBlog } from "@/lib/types";
import type { HomeLayoutProps } from "@/components/themes/registry";
import { PublicFeaturedPosts } from "@/components/public/feed";
import { PublicCategoryFilter } from "@/components/public/category-filter";
import { PublicPostCard } from "@/components/public/post-card";
import { SubscribeToAuthor } from "@/components/public/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { StructuredData } from "@/components/structured-data";
import { generateWebSiteSchema } from "@/lib/structured-data";
import { getPublicProfileUrl } from "@/lib/public-url";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardHomeLayout({
  site,
  blogs,
  pages,
  categories,
  subdomain,
  host,
  basePath,
}: HomeLayoutProps) {
  const displayName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(site.subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const hasHero = Boolean((site.hero_title || "").trim() || (site.hero_description || "").trim());

  const pinnedBlogs = blogs.filter((b) => b.is_pinned);
  const firstCatFor = (b: PublicBlog) =>
    b.category_ids && b.category_ids.length > 0
      ? categories.find((c) => c.category_id === b.category_ids![0]) ?? null
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateWebSiteSchema(site, withJsonLdSlash(`https://${host}${basePath}`, site))} />
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={displayName}
        titleHref={titleHref}
        hasBlogs={blogs.length > 0}
      />
      <main className={mainSpacing}>
        {/* Hero */}
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

        {/* Pinned post spotlight */}
        {pinnedBlogs.length > 0 ? (
          <div className="mt-20 mb-20 space-y-10">
            {pinnedBlogs.map((b) => (
              <div key={b.blog_id} className="mx-auto w-full lg:max-w-[70%]">
                <PublicPostCard
                  large
                  blog={b}
                  subdomain={subdomain}
                  basePath={basePath}
                  category={firstCatFor(b)}
                  categories={categories}
                  showExcerpt={site.show_excerpt !== false}
                />
              </div>
            ))}
          </div>
        ) : null}

        {/* Featured */}
        <PublicFeaturedPosts
          blogs={blogs}
          subdomain={subdomain}
          site={site}
          basePath={basePath}
          categories={categories}
          showExcerpt={site.show_excerpt !== false}
        />

        {/* Category filter + Feed */}
        <PublicCategoryFilter
          blogs={blogs}
          subdomain={subdomain}
          site={site}
          basePath={basePath}
          categories={categories}
          showExcerpt={site.show_excerpt !== false}
        />

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}