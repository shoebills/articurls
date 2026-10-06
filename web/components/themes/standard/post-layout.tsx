import Link from "next/link";
import { Calendar, ChevronLeft } from "lucide-react";
import type { PostLayoutProps } from "@/components/themes/registry";
import { PublicPostCard } from "@/components/public/post-card";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { PublicFaqSection } from "@/components/public/faq-section";
import { ContentEndCta } from "@/components/public/content-end-cta";
import { BlogPostShareMenu } from "@/components/public/post-share-menu";
import { BlogPostToc } from "@/components/public/post-toc";
import { StructuredData } from "@/components/structured-data";
import {
  generateBlogPostingSchema,
  generateFaqPageSchema,
  generateBreadcrumbList,
} from "@/lib/structured-data";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages, transformImageUrl, generateSrcSet } from "@/lib/image-transform";
import { getPublicProfileUrl, getPublicAuthorUrl } from "@/lib/public-url";
import { injectHeadingIds } from "@/lib/toc";
import { assetUrl } from "@/lib/env";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardPostLayout({
  site,
  blog,
  pages,
  categories,
  allBlogs,
  subdomain,
  host,
  basePath,
}: PostLayoutProps) {
  const navBlogName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const relatedIdOrder = ((blog.related_blog_ids || []) as unknown[]).map(String);
  const relatedById = new Map((allBlogs || []).map((b) => [String(b.blog_id), b]));
  const relatedBlogs = relatedIdOrder
    .flatMap((id) => {
      const match = relatedById.get(id);
      return match && match.blog_id !== blog.blog_id ? [match] : [];
    })
    .slice(0, 3);

  const currentUrl = `https://${host}${basePath}/${encodeURIComponent(blog.slug)}`;
  const featuredBaseUrl = blog.featured_image_url ? assetUrl(blog.featured_image_url) : null;
  const featuredImageUrl = featuredBaseUrl
    ? transformImageUrl(featuredBaseUrl, { width: 1200, fit: "cover" })
    : null;
  const featuredImageSrcSet = featuredBaseUrl ? generateSrcSet(featuredBaseUrl, [400, 800, 1200]) : null;
  const { html: blogHtmlWithIds, headings: tocHeadings } = injectHeadingIds(
    transformHtmlImages(sanitizeHtml(blog.content))
  );

  const blogPostContent = (
    <>
      <div className="flex items-center justify-between">
        <Link href={getPublicProfileUrl(subdomain, basePath)} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          Back
        </Link>
        <BlogPostShareMenu url={currentUrl} title={blog.title} />
      </div>
      <header className="mt-6 sm:mt-8">
        <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          {blog.title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          {blog.author ? (
            <Link
              href={getPublicAuthorUrl(subdomain, blog.author.slug, basePath)}
              className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {blog.author.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={transformImageUrl(assetUrl(blog.author.profile_image_url), { width: 48, height: 48, fit: "cover" })}
                  alt={blog.author.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : null}
              <span className="truncate font-medium">{blog.author.name}</span>
            </Link>
          ) : null}
          {blog.published_at && (
            <time className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" dateTime={blog.published_at}>
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {new Date(blog.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </time>
          )}
        </div>
      </header>
      {featuredImageUrl ? (
        <figure className="mt-6 sm:mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredImageUrl}
            srcSet={featuredImageSrcSet ?? undefined}
            sizes="(max-width: 1024px) 100vw, 768px"
            alt={blog.title}
            loading="eager"
            decoding="async"
            className="aspect-[16/9] w-full rounded-2xl object-cover"
          />
        </figure>
      ) : null}
      <div className={featuredImageUrl ? "mt-8 sm:mt-10" : "mt-12"}>
        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: blogHtmlWithIds }} />
      </div>

      {Array.isArray(blog.faq_items) && blog.faq_items.length > 0 && (
        <PublicFaqSection items={blog.faq_items} />
      )}
    </>
  );

  const relatedArticles = relatedBlogs.length > 0 ? (
        <section className="mt-10 pt-6 sm:mt-14 sm:pt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Related posts
        </h3>
        <Link
          href={getPublicProfileUrl(subdomain, basePath)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        {relatedBlogs.map((rel) => (
          <PublicPostCard
            key={rel.blog_id}
            blog={rel}
            subdomain={subdomain}
            basePath={basePath}
            categories={categories}
            showExcerpt={site.show_excerpt !== false}
          />
        ))}
      </div>
    </section>
  ) : null;

  return (
    <article className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateBlogPostingSchema(blog, site, withJsonLdSlash(currentUrl, site))} />
      <StructuredData data={generateBreadcrumbList([
        { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(`https://${host}${basePath}`, site) },
        { name: blog.meta_title || blog.title, url: withJsonLdSlash(currentUrl, site) },
      ])} />
      {Array.isArray(blog.faq_items) && blog.faq_items.length > 0 && (
        <StructuredData data={generateFaqPageSchema(blog.faq_items, withJsonLdSlash(currentUrl, site))} />
      )}
      {blog.custom_schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blog.custom_schema) }}
        />
      )}
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={navBlogName}
        titleHref={titleHref}
        hasBlogs={relatedBlogs.length > 0}
      />
      <main className={mainSpacing}>
        {site.toc_enabled !== false ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,48rem)_minmax(0,16rem)] lg:justify-center lg:gap-12">
            <div className="max-w-3xl">
              <div className="mb-5 sm:mb-6 lg:hidden">
                <BlogPostToc headings={tocHeadings} collapsible defaultCollapsed />
              </div>
              {blogPostContent}
            </div>
            <aside className="hidden lg:block sticky top-24 self-start z-30">
              <BlogPostToc headings={tocHeadings} />
            </aside>
          </div>
        ) : (
          blogPostContent
        )}
            <div className="mx-auto w-full sm:max-w-[80%]">
              <ContentEndCta site={site} />
            </div>
            {relatedArticles}
            <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </article>
  );
}