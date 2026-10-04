import { cache } from "react";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { API_URL, UGC_ORIGIN, assetUrl } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
} from "@/lib/request-host";
import type { PublicBlog, PublicSite, UserPage, Category, PublicCategoryBlogsResponse, DomainLookupResponse, PublicAuthorDetail, PublicResolvedContent } from "@/lib/types";
import { PublicFaqSection } from "@/components/public-faq-section";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public-nav-header";
import { PublicPostCard } from "@/components/public-post-card";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { resolveBlogOgImage } from "@/lib/blog-images";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages, transformImageUrl, generateSrcSet } from "@/lib/image-transform";
import { getPublicCategoryUrl, getPublicProfileUrl, getPublicAuthorUrl } from "@/lib/public-url";
import { excerptFromHtml } from "@/lib/text";
import { faviconIcons } from "@/lib/favicon";
import { ContentEndCta } from "@/components/content-end-cta";
import { StructuredData } from "@/components/structured-data";
import { generateWebSiteSchema, generateBlogPostingSchema, generateCollectionPageSchema, generateWebPageSchema, generateAuthorProfileSchema, generateFaqPageSchema, generateBreadcrumbList } from "@/lib/structured-data";
import { BriefcaseBusiness, Calendar, ChevronLeft, Globe } from "lucide-react";
import { BlogPostShareMenu } from "@/components/blog-post-share-menu";
import { BlogPostToc } from "@/components/blog-post-toc";
import { injectHeadingIds } from "@/lib/toc";
import { ThemeStyleWrapper } from "@/components/themes/theme-wrapper";
import { StandardTemplate } from "@/components/themes/standard/standard-template";
import { loadPublicSite } from "@/lib/public-site";

type Props = { params: Promise<{ domain: string; slug?: string[] }> };

export function generateStaticParams() {
  return [];
}
export const dynamicParams = true;
export const revalidate = 86400;

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveSiteName(site: PublicSite | null | undefined): string {
  return (site?.site_name || "").trim() || site?.name || site?.subdomain || "My Blog";
}

function resolveSiteOgImage(site: PublicSite | null | undefined): string | undefined {
  if (site?.og_image_url) return transformImageUrl(assetUrl(site.og_image_url), { width: 1200, height: 630, fit: "cover" });
  return undefined;
}

function resolvePageDescription(page: UserPage): string | undefined {
  const metaDescription = (page.meta_description || "").trim();
  if (metaDescription) return metaDescription;
  const contentDescription = excerptFromHtml(page.content || "").trim();
  return contentDescription || undefined;
}

function withTrailingSlash(url: string, enabled: boolean): string {
  if (!enabled || url.endsWith("/")) return url;
  return `${url}/`;
}

function withJsonLdSlash(url: string, site?: PublicSite | null): string {
  return withTrailingSlash(url, site?.seo_trailing_slash_jsonld === true);
}

function resolveNoindex(noindex: boolean): { index: false; follow: true } | undefined {
  return noindex ? { index: false, follow: true } : undefined;
}

function isSiteIndexingOff(site?: PublicSite | null): boolean {
  return site?.seo_indexing_enabled === false;
}

function resolveGoogleVerification(site?: PublicSite | null): Metadata["verification"] {
  const token = (site?.search_console_verification_token || "").trim();
  return token ? { google: token } : undefined;
}

function resolveRoutingSegments(
  rawSegments: string[],
  customSubpath?: string | null
): { segments: string[]; basePath: string } {
  const base = (customSubpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!base) {
    return { segments: rawSegments, basePath: "" };
  }

  const baseParts = base.split("/");
  const matches = baseParts.every((part, idx) => rawSegments[idx] === part);
  if (matches) {
    return {
      segments: rawSegments.slice(baseParts.length),
      basePath: `/${base}`,
    };
  }
  return { segments: rawSegments, basePath: `/${base}` };
}

const resolveDomainInfo = cache(async (host: string): Promise<DomainLookupResponse | null> => {
  const ugcHost = new URL(UGC_ORIGIN).hostname;
  const RESERVED = new Set(["www", "app", "api", "admin", "mail", "support"]);
  if (host.endsWith(`.${ugcHost}`)) {
    const subdomain = host.split(".")[0];
    if (subdomain && !RESERVED.has(subdomain)) {
      return { subdomain: subdomain, domain_status: "active", redirect_to: null, custom_subpath: null };
    }
  }
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        next: {
          revalidate: 86400,
          tags: [`domain-${host}`, "domains"],
        },
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      subdomain: data.subdomain,
      domain_status: data.domain_status,
      redirect_to: data.redirect_to ?? null,
      custom_subpath: data.custom_subpath ?? null,
    };
  } catch {
    return null;
  }
});

const loadSite = loadPublicSite;

const loadBlogs = cache(async (subdomain: string): Promise<PublicBlog[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/blogs`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "posts-list", "home"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadContent = cache(async (subdomain: string, slug: string): Promise<PublicResolvedContent | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/content/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `post-${slug}`, `page-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadRedirect = cache(async (subdomain: string, path: string): Promise<{ target_url: string; type: string } | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/redirect?path=${encodeURIComponent(path)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, "redirects"],
      },
    }
  );
  if (!res.ok) return null;
  return res.json();
});

const loadPages = cache(async (subdomain: string): Promise<UserPage[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/pages`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "pages-list", "posts-list"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadCategories = cache(async (subdomain: string): Promise<Category[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/categories`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "categories-list", "posts-list"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadCategoryBlogs = cache(async (subdomain: string, slug: string): Promise<PublicCategoryBlogsResponse | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/category/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `category-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadAuthorBlogs = cache(async (subdomain: string, slug: string): Promise<PublicAuthorDetail | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/author/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `author-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadAllCategories = cache(async (subdomain: string): Promise<Category[]> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/categories?all=true`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, "categories-list"],
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain, slug: rawSegments = [] } = await params;
  const host = decodeURIComponent(domain);
  const runtimeHosts = buildRuntimeHostsFromEnv();
  if (isInternalHost(host, runtimeHosts)) return {};

  const domainInfo = await resolveDomainInfo(host);
  if (!domainInfo) return {};
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") return {};
  const subdomain = domainInfo.subdomain;

  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath);

  const canonical = `https://${host}${basePath}${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
  const alternatesWithFeeds = (site?: PublicSite | null) => {
    const types: Record<string, string> = {};
    if (site?.rss_enabled) {
      types["application/rss+xml"] = `https://${host}${basePath}/rss.xml`;
    }
    if (site?.atom_enabled) {
      types["application/atom+xml"] = `https://${host}${basePath}/atom.xml`;
    }
    return Object.keys(types).length > 0 ? { canonical, types } : { canonical };
  };

  if (segments[0] === "category" && segments[1]) {
    const [site, data] = await Promise.all([loadSite(subdomain), loadCategoryBlogs(subdomain, segments[1])]);
    if (!site || !data) return { title: "Not found" };
    const categoryName = data.category.name || segments[1];
    const title = data.category.meta_title?.trim() || `${categoryName} — ${site.name}`;
    const description = data.category.meta_description?.trim() || `Browse all ${categoryName} posts by ${site.name}.`;
    const siteName = resolveSiteName(site);
    const ogImage =
      (data.blogs[0] ? resolveBlogOgImage(data.blogs[0]) : "") ||
      resolveSiteOgImage(site);
    const categoryCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(site.seo_noindex_categories === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: categoryCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: categoryCanonical,
        type: "website",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${categoryName} cover image`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${categoryName} cover image` }] : undefined,
      },
    };
  }

  if (segments[0] === "author" && segments[1]) {
    const [site, data] = await Promise.all([loadSite(subdomain), loadAuthorBlogs(subdomain, segments[1])]);
    if (!site || !data) return { title: "Not found" };
    const author = data.author;
    const siteName = resolveSiteName(site);
    const title = author.meta_title?.trim() || `${author.name} — Author at ${siteName}`;
    const description = author.meta_description?.trim() || author.bio || `Read articles and essays by ${author.name}.`;
    const ogImage = author.profile_image_url
      ? transformImageUrl(assetUrl(author.profile_image_url), { width: 1200, height: 630, fit: "cover" })
      : resolveSiteOgImage(site);
    const authorCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(author.noindex === true || site.seo_noindex_authors === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: authorCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: authorCanonical,
        type: "profile",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${author.name} avatar`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${author.name} avatar` }] : undefined,
      },
    };
  }

  if (segments[0] === "categories") {
    const site = await loadSite(subdomain);
    if (!site) return { title: "Not found" };
    const siteName = resolveSiteName(site);
    const title = `Categories — ${siteName}`;
    const description = `Explore all topics and categories on ${siteName}.`;
    const ogImage = resolveSiteOgImage(site);
    const hubCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(site.seo_noindex_categories === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: hubCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: hubCanonical,
        type: "website",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image` }] : undefined,
      },
    };
  }

  // Direct single segment: check blog post or custom page
  if (segments.length === 1 && !["category", "author", "categories"].includes(segments[0])) {
    const slug = segments[0];
    const [content, site] = await Promise.all([
      loadContent(subdomain, slug),
      loadSite(subdomain),
    ]);

    if (!content) return { title: "Not found" };

    if (content.type === "blog" && content.blog) {
      const blog = content.blog;
      const title = blog.meta_title || blog.title;
      const description = blog.meta_description || blog.excerpt || excerptFromHtml(blog.content) || undefined;
      const siteName = resolveSiteName(site);
      const postCanonical = blog.canonical_url || canonical;
      const ogImage = blog.og_image_url
        ? transformImageUrl(assetUrl(blog.og_image_url), { width: 1200, height: 630, fit: "cover" })
        : resolveBlogOgImage(blog);
      return {
        title,
        description,
        robots: resolveNoindex(blog.noindex === true || isSiteIndexingOff(site)),
        alternates: alternatesWithFeeds(site),
        icons: faviconIcons(site),
        verification: resolveGoogleVerification(site),
        openGraph: {
          title,
          description,
          url: postCanonical,
          type: "article",
          siteName,
          locale: site?.og_locale || undefined,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image`, width: 1200, height: 630 }] : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image` }] : undefined,
        },
      };
    }

    if (content.type === "page" && content.page) {
      const page = content.page;
      const title = page.meta_title || page.title;
      const description = resolvePageDescription(page);
      const siteName = resolveSiteName(site);
      const pageCanonical = page.canonical_url || canonical;
      const ogImage = page.og_image_url
        ? transformImageUrl(assetUrl(page.og_image_url), { width: 1200, height: 630, fit: "cover" })
        : page.featured_image_url
          ? transformImageUrl(assetUrl(page.featured_image_url), { width: 1200, height: 630, fit: "cover" })
          : resolveSiteOgImage(site);
      return {
        title,
        description,
        robots: resolveNoindex(page.noindex === true || site?.seo_noindex_pages === true || isSiteIndexingOff(site)),
        alternates: alternatesWithFeeds(site),
        icons: faviconIcons(site),
        verification: resolveGoogleVerification(site),
        openGraph: {
          title,
          description,
          url: pageCanonical,
          type: "website",
          siteName,
          locale: site?.og_locale || undefined,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image`, width: 1200, height: 630 }] : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image` }] : undefined,
        },
      };
    }

    return { title: "Not found" };
  }

  // Profile / Homepage
  const site = await loadSite(subdomain);
  if (!site) return { title: "Not found" };
  const title = site.meta_title || `${site.name} — Articurls`;
  const description = site.meta_description || undefined;
  const siteName = resolveSiteName(site);
  const ogImage = resolveSiteOgImage(site);
  const homeCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
  return {
    title,
    description,
    robots: resolveNoindex(isSiteIndexingOff(site)),
    alternates: { ...alternatesWithFeeds(site), canonical: homeCanonical },
    icons: faviconIcons(site),
    verification: resolveGoogleVerification(site),
    openGraph: {
      title,
      description,
      url: homeCanonical,
      type: "website",
      siteName,
      locale: site.og_locale || undefined,
      images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image`, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image` }] : undefined,
    },
  };
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  other: {
    preconnect: ["https://images.articurls.com"],
    "dns-prefetch": "https://images.articurls.com",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SitePublicationPage({ params }: Props) {
  const { domain, slug: rawSegments = [] } = await params;
  const host = decodeURIComponent(domain);
  const runtimeHosts = buildRuntimeHostsFromEnv();

  if (isInternalHost(host, runtimeHosts)) notFound();

  const domainInfo = await resolveDomainInfo(host);
  
  if (!domainInfo) {
    notFound();
  }

  if (domainInfo.domain_status === "expired") {
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    const redirectUrl = `https://${encodeURIComponent(domainInfo.subdomain)}.${ugcHost}${pathname}`;
    permanentRedirect(redirectUrl);
  }

  if (domainInfo.domain_status === "pending") {
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    redirect(`https://${encodeURIComponent(domainInfo.subdomain)}.${ugcHost}${pathname}`);
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    notFound();
  }

  const subdomain = domainInfo.subdomain;
  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath);

  const pathname = `${basePath}${segments.length === 0 ? "" : `/${segments.join("/")}`}`;
  const siteOrigin = `https://${host}${basePath}`;

  if (domainInfo.redirect_to) {
    permanentRedirect(`${domainInfo.redirect_to}${pathname}`);
  }

  // ── Site-level redirects (checked before content resolution) ────────────
  const lookupPath = segments.length === 0 ? "/" : `/${segments.join("/")}`;
  const pathRedirect = await loadRedirect(subdomain, lookupPath);
  if (pathRedirect) {
    const target = pathRedirect.target_url;
    const dest = target.startsWith("/")
      ? `${siteOrigin}${target === "/" ? "" : target}`
      : target;
    if (pathRedirect.type === "temporary") {
      redirect(dest);
    }
    permanentRedirect(dest);
  }

  // ── Blog post or Custom page: /[slug] ────────────────────────────────────
  if (segments.length === 1 && !["category", "author", "categories"].includes(segments[0])) {
    const slug = segments[0];
    const [content, site, pages, categories, allBlogs] = await Promise.all([
      loadContent(subdomain, slug),
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadBlogs(subdomain),
    ]);

    if (!site || !content) notFound();

    // Render Blog post if found
    if (content.type === "blog" && content.blog) {
      const blog = content.blog;
      const navBlogName = resolveSiteName(site);
      const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
      const isNavEnabled = site.navbar_enabled !== false;
      const mainSpacing = getPublicMainSpacing(isNavEnabled);

      const otherBlogs = (allBlogs || []).filter((b) => b.blog_id !== blog.blog_id);
      const currentCatIds = blog.category_ids || [];
      const sameCategoryBlogs = currentCatIds.length > 0
        ? otherBlogs.filter((b) => b.category_ids?.some((id) => currentCatIds.includes(id)))
        : [];
      const remainderBlogs = otherBlogs.filter((b) => !sameCategoryBlogs.some((s) => s.blog_id === b.blog_id));
      const relatedBlogs = [...sameCategoryBlogs, ...remainderBlogs].slice(0, 3);

      const currentUrl = `https://${host}${basePath}/${encodeURIComponent(slug)}`;
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
                className="block h-auto w-full rounded-2xl"
              />
            </figure>
          ) : null}
          <div className={featuredImageUrl ? "mt-8 sm:mt-10" : "mt-12"}>
            <div className="prose-blog" dangerouslySetInnerHTML={{ __html: blogHtmlWithIds }} />
          </div>

          {Array.isArray(blog.faq_items) && blog.faq_items.length > 0 && (
            <PublicFaqSection items={blog.faq_items} />
          )}

          {/* Related Articles */}
          {relatedBlogs.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border/60">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Related articles
                </h3>
                <Link
                  href={getPublicProfileUrl(subdomain, basePath)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedBlogs.map((rel) => (
                  <PublicPostCard
                    key={rel.blog_id}
                    blog={rel}
                    subdomain={subdomain}
                    basePath={basePath}
                    variant="compact"
                  />
                ))}
              </div>
            </section>
          )}
        </>
      );

      return (
        <ThemeStyleWrapper site={site}>
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
            <ContentEndCta site={site} />
            <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
          </main>
        </article>
        </ThemeStyleWrapper>
      );
    }

    // Render Custom page if found
    if (content.type === "page" && content.page) {
      const page = content.page;
      const navBlogName = resolveSiteName(site);
      const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
      const contentWidth = "max-w-3xl";
      const isNavEnabled = site.navbar_enabled !== false;
      const mainSpacing = getPublicMainSpacing(isNavEnabled);

      const currentUrl = `https://${host}${basePath}/${encodeURIComponent(slug)}`;

      const pageFeaturedBaseUrl = page.featured_image_url ? assetUrl(page.featured_image_url) : null;
      const pageFeaturedImageUrl = pageFeaturedBaseUrl
        ? transformImageUrl(pageFeaturedBaseUrl, { width: 1200, fit: "cover" })
        : null;
      const pageFeaturedSrcSet = pageFeaturedBaseUrl ? generateSrcSet(pageFeaturedBaseUrl, [400, 800, 1200]) : null;

      return (
        <ThemeStyleWrapper site={site}>
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
                    className="block h-auto w-full rounded-2xl"
                  />
                </figure>
              ) : null}
              <article className={pageFeaturedImageUrl ? "mt-8 sm:mt-10" : "mt-12"}>
                <div className="prose-blog" dangerouslySetInnerHTML={{ __html: transformHtmlImages(sanitizeHtml(page.content)) }} />
              </article>

              {Array.isArray(page.faq_items) && page.faq_items.length > 0 && (
                <PublicFaqSection items={page.faq_items} />
              )}
            </div>
            <ContentEndCta site={site} isPage />
            <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
          </main>
        </div>
        </ThemeStyleWrapper>
      );
    }

    notFound();
  }

  // ── Category page: /category/[slug] ───────────────────────────────────────
  if (segments[0] === "category") {
    if (!segments[1]) notFound();
    const categorySlug = segments[1];
    const [site, pages, categories, data] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadCategoryBlogs(subdomain, categorySlug),
    ]);

    if (!site || !data) notFound();

    const blogs = data.blogs;
    const categoryName = data.category.name;
    const navBlogName = resolveSiteName(site);
    const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
    const isNavEnabled = site.navbar_enabled !== false;
    const mainSpacing = getPublicMainSpacing(isNavEnabled);

    const currentUrl = `https://${host}${basePath}/category/${encodeURIComponent(categorySlug)}`;

    return (
      <ThemeStyleWrapper site={site}>
      <div className="min-h-screen bg-background text-foreground">
        <StructuredData data={generateCollectionPageSchema(data.category, site, withJsonLdSlash(currentUrl, site))} />
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
            <p className="mt-2 text-sm text-muted-foreground">
              {blogs.length} {blogs.length === 1 ? "article" : "articles"} in this category
            </p>
          </div>

          {site.newsletter_show_near_header ? (
            <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 mb-10">
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

          <PublicBlogListSearch
            blogs={blogs}
            subdomain={site.subdomain}
            site={site}
            hideFeatured
            content_layout={site.content_layout || "grid"}
            show_preview_in_lists={site.show_preview_in_lists ?? true}
            basePath={basePath}
          />

          <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
        </main>
      </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Author page: /author/[slug] ───────────────────────────────────────────
  if (segments[0] === "author") {
    if (!segments[1]) notFound();
    const authorSlug = segments[1];
    const [site, pages, categories, data] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadAuthorBlogs(subdomain, authorSlug),
    ]);

    if (!site || !data) notFound();

    const blogs = data.blogs;
    const author = data.author;
    const navBlogName = resolveSiteName(site);
    const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
    const isNavEnabled = site.navbar_enabled !== false;
    const mainSpacing = getPublicMainSpacing(isNavEnabled);

    const currentUrl = `https://${host}${basePath}/author/${encodeURIComponent(authorSlug)}`;
    const siteUrl = `https://${host}${basePath}`;
    const authorAvatar = author.profile_image_url ? assetUrl(author.profile_image_url) : null;

    return (
      <ThemeStyleWrapper site={site}>
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

            {site.newsletter_show_near_header ? (
              <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 mb-10">
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

            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight">Articles by {author.name}</h2>
            </div>

            <PublicBlogListSearch
              blogs={blogs}
              subdomain={site.subdomain}
              site={site}
              hideFeatured
                content_layout={site.content_layout || "grid"}
              show_preview_in_lists={site.show_preview_in_lists ?? true}
              basePath={basePath}
            />

            <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
          </main>
        </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Categories Hub page: /categories ──────────────────────────────────────
  if (segments[0] === "categories") {
    const [site, pages, allCategories] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadAllCategories(subdomain),
    ]);

    if (!site) notFound();

    const navBlogName = resolveSiteName(site);
    const titleHref = site.logo_link || getPublicProfileUrl(subdomain, basePath);
    const isNavEnabled = site.navbar_enabled !== false;
    const mainSpacing = getPublicMainSpacing(isNavEnabled);

    const currentUrl = `https://${host}${basePath}/categories`;

    return (
      <ThemeStyleWrapper site={site}>
        <div className="min-h-screen bg-background text-foreground">
          <StructuredData data={generateWebPageSchema({ title: "Categories", slug: "categories", content: "", meta_title: `Categories — ${site.name}`, meta_description: `Explore all topics and categories on ${site.name}.` } as UserPage, site, withJsonLdSlash(currentUrl, site))} />
          <StructuredData data={generateBreadcrumbList([
            { name: resolveSiteName(site) || "Home", url: withJsonLdSlash(`https://${host}${basePath}`, site) },
            { name: "Categories", url: withJsonLdSlash(currentUrl, site) },
          ])} />
          <PublicNavHeader
            site={site}
            categories={allCategories}
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
              {allCategories.map((cat) => (
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
      </ThemeStyleWrapper>
    );
  }

  // ── Publication homepage: / ───────────────────────────────────────────────
  const [site, blogs, pages, categories] = await Promise.all([
    loadSite(subdomain),
    loadBlogs(subdomain),
    loadPages(subdomain),
    loadCategories(subdomain),
  ]);

  if (!site) notFound();

  return (
    <ThemeStyleWrapper site={site}>
      <StructuredData data={generateWebSiteSchema(site, withJsonLdSlash(siteOrigin, site))} />
      <StandardTemplate site={site} blogs={blogs} pages={pages} categories={categories} basePath={basePath} />
    </ThemeStyleWrapper>
  );
}
