import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { PageLayoutProps } from "@/components/themes/registry";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { PublicFaqSection } from "@/components/public/faq-section";
import { ContentEndCta } from "@/components/public/content-end-cta";
import { BlogPostShareMenu } from "@/components/public/post-share-menu";
import { BlogPostToc } from "@/components/public/post-toc";
import { StructuredData } from "@/components/structured-data";
import {
  generateWebPageSchema,
  generateFaqPageSchema,
  generateBreadcrumbList,
} from "@/lib/structured-data";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages, transformImageUrl, generateSrcSet } from "@/lib/image-transform";
import { getPublicProfileUrl } from "@/lib/public-url";
import { injectHeadingIds } from "@/lib/toc";
import { assetUrl } from "@/lib/env";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardPageLayout({
  site,
  page,
  pages,
  categories,
  subdomain,
  host,
  basePath,
}: PageLayoutProps) {
  const navBlogName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
  const contentWidth = "max-w-3xl";
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const currentUrl = `https://${host}${basePath}/${encodeURIComponent(page.slug)}`;

  const pageFeaturedBaseUrl = page.featured_image_url ? assetUrl(page.featured_image_url) : null;
  const pageFeaturedImageUrl = pageFeaturedBaseUrl
    ? transformImageUrl(pageFeaturedBaseUrl, { width: 1200, fit: "cover" })
    : null;
  const pageFeaturedSrcSet = pageFeaturedBaseUrl ? generateSrcSet(pageFeaturedBaseUrl, [400, 800, 1200]) : null;
  const { html: pageHtmlWithIds, headings: tocHeadings } = injectHeadingIds(
    transformHtmlImages(sanitizeHtml(page.content))
  );

  const pageBodyContent = (
    <div className={contentWidth ? `mx-auto ${contentWidth}` : ""}>
      <div className="flex items-center justify-between">
        <Link
          href={getPublicProfileUrl(subdomain, basePath)}
          className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Back
        </Link>
        <BlogPostShareMenu url={currentUrl} title={page.title} />
      </div>

      <header className="mt-6 sm:mt-8">
        <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">{page.title}</h1>
        {page.updated_at && (
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated {new Date(page.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
      </header>
      {pageFeaturedImageUrl ? (
        <figure className="mt-6 sm:mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pageFeaturedImageUrl}
            srcSet={pageFeaturedSrcSet ?? undefined}
            sizes="(max-width: 1024px) 100vw, 768px"
            alt={page.title}
            loading="eager"
            decoding="async"
            className="aspect-[16/9] w-full rounded-2xl object-cover"
          />
        </figure>
      ) : null}
      <article className={pageFeaturedImageUrl ? "mt-8 sm:mt-10" : "mt-12"}>
        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: pageHtmlWithIds }} />
      </article>

      {Array.isArray(page.faq_items) && page.faq_items.length > 0 && (
        <PublicFaqSection items={page.faq_items} />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateWebPageSchema(page, site, withJsonLdSlash(currentUrl, site))} />
      <StructuredData data={generateBreadcrumbList([
        { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(`https://${host}${basePath}`, site) },
        { name: page.title || "Untitled Page", url: withJsonLdSlash(currentUrl, site) },
      ])} />
      {Array.isArray(page.faq_items) && page.faq_items.length > 0 && (
        <StructuredData data={generateFaqPageSchema(page.faq_items, withJsonLdSlash(currentUrl, site))} />
      )}
      {page.custom_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(page.custom_schema) }}
        />
      )}
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={navBlogName}
        titleHref={titleHref}
        hasBlogs={false}
      />
      <main className={mainSpacing}>
        {site.toc_enabled !== false ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,48rem)_minmax(0,16rem)] lg:justify-center lg:gap-12">
            <div className="max-w-3xl">
              <div className="mb-5 sm:mb-6 lg:hidden">
                <BlogPostToc headings={tocHeadings} collapsible defaultCollapsed />
              </div>
              {pageBodyContent}
            </div>
            <aside className="hidden lg:block sticky top-24 self-start z-30">
              <BlogPostToc headings={tocHeadings} />
            </aside>
          </div>
        ) : (
          pageBodyContent
        )}
        <ContentEndCta site={site} isPage />
        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}