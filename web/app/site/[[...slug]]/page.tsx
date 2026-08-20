import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { API_URL, UGC_ORIGIN, assetUrl } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromHeaders,
} from "@/lib/request-host";
import type { PublicBlog, PublicUser, UserPage, Category, PublicCategoryBlogsResponse, DomainLookupResponse, PublicAuthorDetail } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicDesktopNav } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { resolveBlogOgImage } from "@/lib/blog-images";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages, transformImageUrl, generateSrcSet } from "@/lib/image-transform";
import { getPublicCategoryUrl, getPublicProfileUrl, getPublicAuthorUrl } from "@/lib/public-url";
import { excerptFromHtml } from "@/lib/text";
import { faviconIcons } from "@/lib/favicon";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { StructuredData } from "@/components/structured-data";
import { generateWebSiteSchema, generateBlogPostingSchema, generateCollectionPageSchema, generateWebPageSchema, generateAuthorProfileSchema } from "@/lib/structured-data";
import { Calendar, ChevronLeft, Globe, Mail } from "lucide-react";
import { BlogPostShareMenu } from "@/components/blog-post-share-menu";
import { BlogPostToc } from "@/components/blog-post-toc";
import { injectHeadingIds } from "@/lib/toc";
import { ThemeStyleWrapper } from "@/components/themes/theme-wrapper";
import { EditorialTemplate } from "@/components/themes/editorial/editorial-template";
import { SaasTemplate } from "@/components/themes/saas/saas-template";

const publicNavHeaderClass = "sticky top-0 z-40 mb-8 border-b border-border/70 bg-background pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:mb-10 sm:pb-5 sm:pt-6";

type Props = { params: Promise<{ slug?: string[] }> };

export const dynamic = "force-dynamic";

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserSiteName(user: PublicUser | null | undefined): string {
  return (user?.nav_blog_name || "").trim() || "My Blog";
}

function resolveUserOgImage(user: PublicUser | null | undefined): string | undefined {
  if (user?.og_image_url) return transformImageUrl(assetUrl(user.og_image_url), { width: 1200, height: 630, fit: "cover" });
  const profileImage = assetUrl(user?.profile_image_url);
  if (profileImage) return profileImage;
  return undefined;
}

function resolvePageDescription(page: UserPage): string | undefined {
  const metaDescription = (page.meta_description || "").trim();
  if (metaDescription) return metaDescription;
  const contentDescription = excerptFromHtml(page.content || "").trim();
  return contentDescription || undefined;
}

function resolveRoutingSegments(
  rawSegments: string[],
  customSubpath?: string | null,
  headerBasepath?: string | null
): { segments: string[]; basePath: string } {
  const base = (customSubpath || headerBasepath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
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

function resolveNavLinks(user: PublicUser, categories: Category[], basePath: string) {
  const hasCustomNav = Array.isArray(user.nav_items) && user.nav_items.length > 0;
  if (hasCustomNav) {
    return user.nav_items!.map((item) => ({
      href: item.url.startsWith("/") ? `${basePath}${item.url}` : item.url,
      label: item.label,
      is_cta: item.is_cta,
      open_in_new_tab: item.open_in_new_tab,
    }));
  }
  if (!user.nav_menu_enabled) return [];
  return categories.map((c) => ({
    href: getPublicCategoryUrl(user.user_name, c.slug, basePath),
    label: c.name,
  }));
}

async function resolveDomainInfo(host: string): Promise<DomainLookupResponse | null> {
  const ugcHost = new URL(UGC_ORIGIN).hostname;
  const RESERVED = new Set(["www", "app", "api", "admin", "mail", "support"]);
  if (host.endsWith(`.${ugcHost}`)) {
    const subdomain = host.split(".")[0];
    if (subdomain && !RESERVED.has(subdomain)) {
      return { username: subdomain, domain_status: "active", redirect_to: null, custom_subpath: null };
    }
  }
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        cache: "force-cache",
        next: { revalidate: 60 },
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: data.username,
      domain_status: data.domain_status,
      redirect_to: data.redirect_to ?? null,
      custom_subpath: data.custom_subpath ?? null,
    };
  } catch {
    return null;
  }
}

const loadUser = cache(async (username: string): Promise<PublicUser | null> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
});

async function loadBlogs(username: string): Promise<PublicBlog[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blogs`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadBlog(username: string, slug: string): Promise<PublicBlog | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadPages(username: string): Promise<UserPage[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadCategories(username: string): Promise<Category[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadPage(username: string, slug: string): Promise<UserPage | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/page/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadCategoryBlogs(username: string, slug: string): Promise<PublicCategoryBlogsResponse | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/category/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadAuthorBlogs(username: string, slug: string): Promise<PublicAuthorDetail | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/author/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadAllCategories(username: string): Promise<Category[]> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/categories?all=true`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = await headers();
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const host = resolveTenantHostFromHeaders(h, runtimeHosts);
  if (isInternalHost(host, runtimeHosts)) return {};

  const domainInfo = await resolveDomainInfo(host);
  if (!domainInfo) return {};
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") return {};
  const username = domainInfo.username;

  const { slug: rawSegments = [] } = await params;
  const headerBasepath = h.get("x-articurls-basepath");
  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath, headerBasepath);

  const canonical = `https://${host}${basePath}${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
  const alternatesWithOptionalRss = (rssEnabled: boolean) =>
    rssEnabled
      ? { canonical, types: { "application/rss+xml": `https://${host}${basePath}/rss.xml` } }
      : { canonical };

  // Blog post: /blog/[slug] or direct [slug] under subpath
  let postSlug: string | null = null;
  if (segments[0] === "blog" && segments[1]) {
    postSlug = segments[1];
  } else if (segments.length === 1 && segments[0] !== "category" && segments[0] !== "page" && basePath) {
    postSlug = segments[0];
  }

  if (postSlug) {
    const [blog, author] = await Promise.all([loadBlog(username, postSlug), loadUser(username)]);
    if (!blog) return { title: "Not found" };
    const title = blog.meta_title || blog.title;
    const description = blog.meta_description || blog.excerpt || excerptFromHtml(blog.content) || undefined;
    const siteName = resolveUserSiteName(author);
    const ogImage = resolveBlogOgImage(blog);
    return {
      title,
      description,
      alternates: alternatesWithOptionalRss(author?.rss_enabled !== false),
      icons: faviconIcons(author),
      openGraph: {
        title,
        description,
        url: canonical,
        type: "article",
        siteName,
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

  if (segments[0] === "page" && segments[1]) {
    const [page, user] = await Promise.all([loadPage(username, segments[1]), loadUser(username)]);
    if (!page) return { title: "Not found" };
    const title = page.meta_title || page.title;
    const description = resolvePageDescription(page);
    const siteName = resolveUserSiteName(user);
    const ogImage = resolveUserOgImage(user);
    return {
      title,
      description,
      alternates: alternatesWithOptionalRss(user?.rss_enabled !== false),
      icons: faviconIcons(user),
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName,
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

  if (segments[0] === "category" && segments[1]) {
    const [user, data] = await Promise.all([loadUser(username), loadCategoryBlogs(username, segments[1])]);
    if (!user || !data) return { title: "Not found" };
    const categoryName = data.category.name || segments[1];
    const title = `${categoryName} — ${user.name}`;
    const description = `Browse all ${categoryName} posts by ${user.name}.`;
    const siteName = resolveUserSiteName(user);
    const ogImage =
      (data.blogs[0] ? resolveBlogOgImage(data.blogs[0]) : "") ||
      resolveUserOgImage(user);
    return {
      title,
      description,
      alternates: alternatesWithOptionalRss(user?.rss_enabled !== false),
      icons: faviconIcons(user),
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName,
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
    const [user, data] = await Promise.all([loadUser(username), loadAuthorBlogs(username, segments[1])]);
    if (!user || !data) return { title: "Not found" };
    const author = data.author;
    const siteName = resolveUserSiteName(user);
    const title = `${author.name} — Author at ${siteName}`;
    const description = author.bio || `Read articles and essays by ${author.name}.`;
    const ogImage = author.profile_image_url
      ? transformImageUrl(assetUrl(author.profile_image_url), { width: 1200, height: 630, fit: "cover" })
      : resolveUserOgImage(user);
    return {
      title,
      description,
      alternates: alternatesWithOptionalRss(user?.rss_enabled !== false),
      icons: faviconIcons(user),
      openGraph: {
        title,
        description,
        url: canonical,
        type: "profile",
        siteName,
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
    const user = await loadUser(username);
    if (!user) return { title: "Not found" };
    const siteName = resolveUserSiteName(user);
    const title = `Categories — ${siteName}`;
    const description = `Explore all topics and categories on ${siteName}.`;
    const ogImage = resolveUserOgImage(user);
    return {
      title,
      description,
      alternates: alternatesWithOptionalRss(user?.rss_enabled !== false),
      icons: faviconIcons(user),
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName,
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

  // Profile / Homepage
  const user = await loadUser(username);
  if (!user) return { title: "Not found" };
  const title = user.meta_title || `${user.name} — Articurls`;
  const description = user.meta_description || undefined;
  const siteName = resolveUserSiteName(user);
  const ogImage = resolveUserOgImage(user);
  return {
    title,
    description,
    alternates: alternatesWithOptionalRss(user.rss_enabled !== false),
    icons: faviconIcons(user),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName,
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
  themeColor: "#f4f5f8",
  other: {
    preconnect: ["https://images.articurls.com"],
    "dns-prefetch": "https://images.articurls.com",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SitePublicationPage({ params }: Props) {
  const h = await headers();
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const host = resolveTenantHostFromHeaders(h, runtimeHosts);

  if (isInternalHost(host, runtimeHosts)) notFound();

  const domainInfo = await resolveDomainInfo(host);
  
  if (!domainInfo) {
    notFound();
  }

  if (domainInfo.domain_status === "expired") {
    const { slug: rawSegments = [] } = await params;
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    const redirectUrl = `https://${encodeURIComponent(domainInfo.username)}.${ugcHost}${pathname}`;
    permanentRedirect(redirectUrl);
  }

  if (domainInfo.domain_status === "pending") {
    const { slug: rawSegments = [] } = await params;
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    redirect(`https://${encodeURIComponent(domainInfo.username)}.${ugcHost}${pathname}`);
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    notFound();
  }

  const username = domainInfo.username;
  const { slug: rawSegments = [] } = await params;
  const headerBasepath = h.get("x-articurls-basepath");
  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath, headerBasepath);

  const pathname = `${basePath}${segments.length === 0 ? "" : `/${segments.join("/")}`}`;
  const siteOrigin = `https://${host}${basePath}`;

  if (domainInfo.redirect_to) {
    permanentRedirect(`${domainInfo.redirect_to}${pathname}`);
  }

  // ── Blog post: /blog/[slug] or direct [slug] under subpath ────────────────
  let postSlug: string | null = null;
  if (segments[0] === "blog" && segments[1]) {
    postSlug = segments[1];
  } else if (segments.length === 1 && segments[0] !== "category" && segments[0] !== "page" && basePath) {
    postSlug = segments[0];
  }

  if (postSlug) {
    const [blog, author, pages, categories] = await Promise.all([
      loadBlog(username, postSlug),
      loadUser(username),
      loadPages(username),
      loadCategories(username),
    ]);

    if (!blog || !author) notFound();

    const navBlogName = (author.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(author.nav_blog_name_size);
    const maxWidth = author.content_width === "wide" ? "max-w-7xl" : "max-w-3xl";
    const containerSpacing = author.navbar_enabled
      ? `mx-auto ${maxWidth} px-[26px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
      : `mx-auto ${maxWidth} px-[26px] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;
    
    const desktopLinks = resolveNavLinks(author, categories, basePath);
    const showSubscriberCollection = author.subscriber_collection_enabled === true;
    const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection;

    const currentUrl = `https://${host}${basePath}/blog/${encodeURIComponent(postSlug)}`;
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
          <Link href={getPublicProfileUrl(username, basePath)} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
                href={getPublicAuthorUrl(username, blog.author.slug, basePath)}
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
            ) : (
              <Link
                href={getPublicProfileUrl(username, basePath)}
                className="inline-flex items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <span className="truncate">{author.name}</span>
              </Link>
            )}
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
        {showSubscriberCollection ? (
          <div className="mt-14">
            <SubscribeToAuthor userName={author.user_name} authorName={author.name} />
          </div>
        ) : null}
      </>
    );

    return (
      <ThemeStyleWrapper user={author}>
        <article className="min-h-screen bg-background">
        <StructuredData data={generateBlogPostingSchema(blog, author, currentUrl)} />
        <main className={containerSpacing}>
          {author.navbar_enabled ? (
            <header className={publicNavHeaderClass} data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  userName={author.user_name}
                  authorName={author.name}
                  alignment={author.navbar_alignment || "left"}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  userName={author.user_name}
                  authorName={author.name}
                  showSubscribeAction={showSubscriberCollection}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}
          {author.content_width === "wide" ? (
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
            <div className="mb-5 sm:mb-6">
              <BlogPostToc headings={tocHeadings} collapsible defaultCollapsed />
            </div>
          )}
          <PublicSiteFooter user={author} pages={pages} basePath={basePath} />
        </main>
      </article>
      </ThemeStyleWrapper>
    );
  }

  // ── Custom page: /page/[slug] ─────────────────────────────────────────────
  if (segments[0] === "page") {
    if (!segments[1]) notFound();
    const pageSlug = segments[1];
    const [user, pages, categories, page] = await Promise.all([
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadPage(username, pageSlug),
    ]);

    if (!user || !page) notFound();

    const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
    const maxWidth = user.content_width === "wide" ? "max-w-7xl" : "max-w-3xl";
    const contentWidth = user.content_width === "wide" ? "max-w-3xl" : "";
    const mainSpacing = user.navbar_enabled
      ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6`
      : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

    const desktopLinks = resolveNavLinks(user, categories, basePath);
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection;

    const currentUrl = `https://${host}${basePath}/page/${encodeURIComponent(pageSlug)}`;

    return (
      <ThemeStyleWrapper user={user}>
      <div className="min-h-screen bg-background text-foreground">
        <main className={mainSpacing}>
          <StructuredData data={generateWebPageSchema(page, user, currentUrl)} />
          {user.navbar_enabled ? (
            <header className={publicNavHeaderClass} data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  userName={user.user_name}
                  authorName={user.name}
                  alignment={user.navbar_alignment || "left"}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  userName={user.user_name}
                  authorName={user.name}
                  showSubscribeAction={showSubscriberCollection}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}

          <div className={contentWidth ? `mx-auto ${contentWidth}` : ""}>
            <div className="flex items-center justify-between">
              <Link
                href={getPublicProfileUrl(username, basePath)}
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
            <article className="mt-12">
              <div className="prose-blog" dangerouslySetInnerHTML={{ __html: transformHtmlImages(sanitizeHtml(page.content)) }} />
            </article>
          </div>
          <PublicSiteFooter user={user} pages={pages} basePath={basePath} />
        </main>
      </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Category page: /category/[slug] ───────────────────────────────────────
  if (segments[0] === "category") {
    if (!segments[1]) notFound();
    const categorySlug = segments[1];
    const [user, pages, categories, data] = await Promise.all([
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadCategoryBlogs(username, categorySlug),
    ]);

    if (!user || !data) notFound();

    const blogs = data.blogs;
    const categoryName = data.category.name;
    const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
    const maxWidth = user.content_width === "wide" ? "max-w-7xl" : "max-w-3xl";
    const mainSpacing = user.navbar_enabled
      ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
      : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

    const desktopLinks = resolveNavLinks(user, categories, basePath);
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection || blogs.length > 0;

    const currentUrl = `https://${host}${basePath}/category/${encodeURIComponent(categorySlug)}`;

    return (
      <ThemeStyleWrapper user={user}>
      <div className="min-h-screen bg-background text-foreground">
        <StructuredData data={generateCollectionPageSchema(data.category, user, currentUrl)} />
        <main className={mainSpacing}>
          {user.navbar_enabled ? (
            <header className={publicNavHeaderClass} data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  userName={user.user_name}
                  authorName={user.name}
                  alignment={user.navbar_alignment || "left"}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, basePath)}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  userName={user.user_name}
                  authorName={user.name}
                  showSubscribeAction={showSubscriberCollection}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}

          <div className="mb-6 flex items-center gap-3">
              <Link
                href={getPublicProfileUrl(username, basePath)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← All posts
              </Link>
              <span className="select-none text-sm text-muted-foreground">·</span>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{categoryName}</h1>
            </div>

            {blogs.length > 0 ? (
              <PublicBlogListSearch
                blogs={blogs}
                username={username}
                user={user}
                hideFeatured
                siteOrigin={siteOrigin}
                content_width={user.content_width || "wide"}
                list_image_position={user.list_image_position || "above_title"}
                show_preview_in_lists={user.show_preview_in_lists ?? true}
              />
            ) : (
              <div className="rounded-xl border border-border/70 bg-background px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
              </div>
            )}
            <PublicSiteFooter user={user} pages={pages} basePath={basePath} />
        </main>
      </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Author Profile page: /author/[slug] ──────────────────────────────────
  if (segments[0] === "author") {
    if (!segments[1]) notFound();
    const authorSlug = segments[1];
    const [user, pages, categories, authorData] = await Promise.all([
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadAuthorBlogs(username, authorSlug),
    ]);

    if (!user || !authorData) notFound();

    const author = authorData.author;
    const blogs = authorData.blogs;
    const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
    const maxWidth = user.content_width === "wide" ? "max-w-7xl" : "max-w-3xl";
    const mainSpacing = user.navbar_enabled
      ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
      : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

    const desktopLinks = resolveNavLinks(user, categories, basePath);
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection || blogs.length > 0;
    const currentUrl = `https://${host}${basePath}/author/${encodeURIComponent(authorSlug)}`;
    const siteUrl = `https://${host}${basePath}`;
    const authorAvatar = author.profile_image_url ? assetUrl(author.profile_image_url) : null;

    return (
      <ThemeStyleWrapper user={user}>
        <div className="min-h-screen bg-background text-foreground">
          <StructuredData data={generateAuthorProfileSchema(author, user, currentUrl, siteUrl)} />
          <main className={mainSpacing}>
            {user.navbar_enabled ? (
              <header className={publicNavHeaderClass} data-public-nav>
                <div className="hidden w-full sm:block">
                  <PublicDesktopNav
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, basePath)}
                    nameSize={blogNameSize}
                    links={desktopLinks}
                    showSubscribe={showSubscriberCollection}
                    userName={user.user_name}
                    authorName={user.name}
                    alignment={user.navbar_alignment || "left"}
                  />
                </div>
                <div className="sm:hidden">
                  <PublicMobileNavMenu
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, basePath)}
                    nameSize={blogNameSize}
                    links={desktopLinks}
                    userName={user.user_name}
                    authorName={user.name}
                    showSubscribeAction={showSubscriberCollection}
                    showMenuButton={hasMobileNav}
                  />
                </div>
              </header>
            ) : null}

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
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{author.name}</h1>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {blogs.length} {blogs.length === 1 ? "article" : "articles"}
                    </span>
                  </div>
                  {author.bio && (
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                      {author.bio}
                    </p>
                  )}
                  {/* Social Links */}
                  <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    {author.website_link && (
                      <a
                        href={author.website_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                    {author.x_link && (
                      <a
                        href={author.x_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        X
                      </a>
                    )}
                    {author.github_link && (
                      <a
                        href={author.github_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        GitHub
                      </a>
                    )}
                    {author.linkedin_link && (
                      <a
                        href={author.linkedin_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        LinkedIn
                      </a>
                    )}
                    {author.contact_email && (
                      <a
                        href={`mailto:${author.contact_email}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Contact
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-3">
              <Link
                href={getPublicProfileUrl(username, basePath)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← All posts
              </Link>
              <span className="select-none text-sm text-muted-foreground">·</span>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Articles by {author.name}</h2>
            </div>

            {blogs.length > 0 ? (
              <PublicBlogListSearch
                blogs={blogs}
                username={username}
                user={user}
                hideFeatured
                siteOrigin={siteOrigin}
                content_width={user.content_width || "wide"}
                list_image_position={user.list_image_position || "above_title"}
                show_preview_in_lists={user.show_preview_in_lists ?? true}
              />
            ) : (
              <div className="rounded-xl border border-border/70 bg-background px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No posts by this author yet.</p>
              </div>
            )}
            <PublicSiteFooter user={user} pages={pages} basePath={basePath} />
          </main>
        </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Categories Hub page: /categories ──────────────────────────────────────
  if (segments[0] === "categories") {
    const [user, pages, categories, allCats] = await Promise.all([
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadAllCategories(username),
    ]);

    if (!user) notFound();

    const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
    const maxWidth = user.content_width === "wide" ? "max-w-7xl" : "max-w-3xl";
    const mainSpacing = user.navbar_enabled
      ? `mx-auto ${maxWidth} px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-0 sm:px-6 sm:pb-14 sm:pt-0`
      : `mx-auto ${maxWidth} px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14`;

    const desktopLinks = resolveNavLinks(user, categories, basePath);
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const hasMobileNav = desktopLinks.length > 0 || showSubscriberCollection;

    return (
      <ThemeStyleWrapper user={user}>
        <div className="min-h-screen bg-background text-foreground">
          <main className={mainSpacing}>
            {user.navbar_enabled ? (
              <header className={publicNavHeaderClass} data-public-nav>
                <div className="hidden w-full sm:block">
                  <PublicDesktopNav
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, basePath)}
                    nameSize={blogNameSize}
                    links={desktopLinks}
                    showSubscribe={showSubscriberCollection}
                    userName={user.user_name}
                    authorName={user.name}
                    alignment={user.navbar_alignment || "left"}
                  />
                </div>
                <div className="sm:hidden">
                  <PublicMobileNavMenu
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, basePath)}
                    nameSize={blogNameSize}
                    links={desktopLinks}
                    userName={user.user_name}
                    authorName={user.name}
                    showSubscribeAction={showSubscriberCollection}
                    showMenuButton={hasMobileNav}
                  />
                </div>
              </header>
            ) : null}

            <div className="mb-8">
              <Link
                href={getPublicProfileUrl(username, basePath)}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-4"
              >
                ← Home
              </Link>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Categories</h1>
              <p className="mt-2 text-base text-muted-foreground">
                Browse all topics and articles published on {navBlogName}.
              </p>
            </div>

            {allCats.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-background px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">No categories available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allCats.map((cat) => (
                  <Link
                    key={cat.category_id}
                    href={getPublicCategoryUrl(username, cat.slug, basePath)}
                    className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-6 shadow-2xs hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {cat.name}
                        </h2>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {cat.blog_count ?? 0}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground">
                      <span>Explore topic</span>
                      <span>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <PublicSiteFooter user={user} pages={pages} basePath={basePath} />
          </main>
        </div>
      </ThemeStyleWrapper>
    );
  }

  // ── Profile / home ────────────────────────────────────────────────────────
  if (segments.length > 0) notFound();

  const [user, blogs, pages, categories] = await Promise.all([
    loadUser(username),
    loadBlogs(username),
    loadPages(username),
    loadCategories(username),
  ]);

  if (!user) notFound();

  const currentUrl = `https://${host}${basePath}`;

  return (
    <ThemeStyleWrapper user={user}>
      <StructuredData data={generateWebSiteSchema(user, currentUrl)} />
      {user.template_id === "saas" ? (
        <SaasTemplate site={user} blogs={blogs} pages={pages} categories={categories} basePath={basePath} />
      ) : (
        <EditorialTemplate site={user} blogs={blogs} pages={pages} categories={categories} basePath={basePath} />
      )}
    </ThemeStyleWrapper>
  );
}