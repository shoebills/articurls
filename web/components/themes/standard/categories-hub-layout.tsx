import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CategoriesHubLayoutProps } from "@/components/themes/registry";
import type { UserPage } from "@/lib/types";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { StructuredData } from "@/components/structured-data";
import { generateWebPageSchema, generateBreadcrumbList } from "@/lib/structured-data";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardCategoriesHubLayout({
  site,
  pages,
  categories,
  subdomain,
  host,
  basePath,
}: CategoriesHubLayoutProps) {
  const navBlogName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const currentUrl = `https://${host}${basePath}/categories`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateWebPageSchema({ title: "Categories", slug: "categories", content: "", meta_title: `Categories — ${site.owner_name}`, meta_description: `Explore all topics and categories on ${site.owner_name}.` } as UserPage, site, withJsonLdSlash(currentUrl, site))} />
      <StructuredData data={generateBreadcrumbList([
        { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(`https://${host}${basePath}`, site) },
        { name: "Categories", url: withJsonLdSlash(currentUrl, site) },
      ])} />
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={navBlogName}
        titleHref={titleHref}
        hasBlogs={false}
      />
      <main className={mainSpacing}>

        {/* Back link */}
        <div className="mb-8">
          <Link
            href={getPublicProfileUrl(subdomain, basePath)}
            className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        {/* Categories Hub Header */}
        <div className="mb-10 text-center sm:mb-12">
          <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Topics & Categories
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse articles by category
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.category_id}
              href={getPublicCategoryUrl(subdomain, cat.slug, basePath)}
              className="group rounded-2xl border border-border/70 bg-card p-6 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
            >
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {cat.name}
              </h3>
              {cat.description ? (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              ) : null}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{cat.blog_count ?? 0} {(cat.blog_count ?? 0) === 1 ? "article" : "articles"}</span>
                <span className="font-medium text-primary group-hover:translate-x-0.5 transition-transform">Browse →</span>
              </div>
            </Link>
          ))}
        </div>

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}