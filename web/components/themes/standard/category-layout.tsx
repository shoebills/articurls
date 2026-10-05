import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CategoryLayoutProps } from "@/components/themes/registry";
import { PublicFeed } from "@/components/public/feed";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { StructuredData } from "@/components/structured-data";
import { generateCollectionPageSchema, generateBreadcrumbList } from "@/lib/structured-data";
import { getPublicProfileUrl } from "@/lib/public-url";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardCategoryLayout({
  site,
  pages,
  categories,
  category,
  blogs,
  subdomain,
  host,
  basePath,
}: CategoryLayoutProps) {
  const categoryName = category.name;
  const navBlogName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const currentUrl = `https://${host}${basePath}/category/${encodeURIComponent(category.slug)}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateCollectionPageSchema(category, site, withJsonLdSlash(currentUrl, site))} />
      <StructuredData data={generateBreadcrumbList([
        { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(`https://${host}${basePath}`, site) },
        { name: categoryName, url: withJsonLdSlash(currentUrl, site) },
      ])} />
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={navBlogName}
        titleHref={titleHref}
        hasBlogs={blogs.length > 0}
      />
      <main className={mainSpacing}>

        {/* Back link */}
        <div className="mb-6">
          <Link
            href={getPublicProfileUrl(subdomain, basePath)}
            className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Back
          </Link>
        </div>

        {/* Category Header */}
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            {categoryName}
          </h1>
        </div>

        <PublicFeed
          blogs={blogs}
          subdomain={site.subdomain}
          site={site}
          hideFeatured
          showExcerpt={site.show_excerpt ?? true}
          basePath={basePath}
          categories={categories}
          recentHeading="Recent Posts"
        />

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}