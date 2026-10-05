import Link from "next/link";
import { BriefcaseBusiness, ChevronLeft, Globe } from "lucide-react";
import type { AuthorLayoutProps } from "@/components/themes/registry";
import { PublicFeed } from "@/components/public/feed";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public/nav-header";
import { PublicSiteFooter } from "@/components/public/site-footer";
import { StructuredData } from "@/components/structured-data";
import { generateAuthorProfileSchema, generateBreadcrumbList } from "@/lib/structured-data";
import { getPublicProfileUrl } from "@/lib/public-url";
import { transformImageUrl } from "@/lib/image-transform";
import { assetUrl } from "@/lib/env";
import { resolveSiteName, withJsonLdSlash } from "@/lib/public-page-helpers";

export function StandardAuthorLayout({
  site,
  pages,
  categories,
  author,
  blogs,
  subdomain,
  host,
  basePath,
}: AuthorLayoutProps) {
  const navBlogName = resolveSiteName(site);
  const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const currentUrl = `https://${host}${basePath}/author/${encodeURIComponent(author.slug)}`;
  const siteUrl = `https://${host}${basePath}`;
  const authorAvatar = author.profile_image_url ? assetUrl(author.profile_image_url) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData data={generateAuthorProfileSchema(author, site, withJsonLdSlash(currentUrl, site), withJsonLdSlash(siteUrl, site))} />
      <StructuredData data={generateBreadcrumbList([
        { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(siteUrl, site) },
        { name: author.name, url: withJsonLdSlash(currentUrl, site) },
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

        {/* Author Profile Header */}
        <div className="mb-12 rounded-2xl border border-border/70 bg-card p-8 sm:p-10 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={transformImageUrl(authorAvatar, { width: 256, height: 256, fit: "cover" })}
                alt={author.name}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-2 border-border/80 shadow-xs shrink-0"
              />
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-3xl">
                {author.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="space-y-3 flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl">{author.name}</h1>
              {author.occupation ? (
                <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <BriefcaseBusiness className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {author.occupation}
                </div>
              ) : null}
              {author.bio ? (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">{author.bio}</p>
              ) : null}
              {author.website_link ? (
                <div className="pt-1">
                  <a
                    href={author.website_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <PublicFeed
          blogs={blogs}
          subdomain={site.subdomain}
          site={site}
          hideFeatured
          showExcerpt={site.show_excerpt ?? true}
          basePath={basePath}
          categories={categories}
          recentHeading={`Recent posts by ${author.name}`}
        />

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}