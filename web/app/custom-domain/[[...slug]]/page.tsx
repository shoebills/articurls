import { headers } from "next/headers";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { API_URL, MARKETING_ORIGIN, UGS_ORIGIN, assetUrl } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
  resolveTenantHostFromHeaders,
} from "@/lib/request-host";
import type { PublicBlog, PublicUser, UserPage, Category, PublicCategoryBlogsResponse } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicDesktopNav } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { SearchProvider } from "@/components/search-context";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicProfileFooter } from "@/components/public-profile-footer";
import { resolveBlogOgImage } from "@/lib/blog-images";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages } from "@/lib/image-transform";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { excerptFromHtml } from "@/lib/text";
import { faviconIcons } from "@/lib/favicon";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { StructuredData } from "@/components/structured-data";
import { generateWebSiteSchema, generateBlogPostingSchema, generateCollectionPageSchema, generateWebPageSchema } from "@/lib/structured-data";
import { ChevronLeft } from "lucide-react";
import { BlogPostShareMenu } from "@/components/blog-post-share-menu";

type Props = { params: Promise<{ slug?: string[] }> };

export const dynamic = "force-dynamic";

// ── Data loaders ─────────────────────────────────────────────────────────────

function resolveUserSiteName(user: PublicUser | null | undefined): string {
  return (user?.nav_blog_name || "").trim() || "My Blog";
}

function resolveUserOgImage(user: PublicUser | null | undefined): string | undefined {
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

async function resolveDomainInfo(host: string): Promise<{ username: string; domain_status: string } | null> {
  try {
    // Domain status drives routing decisions (redirect vs serve vs 404),
    // so it must always be fresh.  The backend already caches the DB
    // lookup in Redis (300 s TTL with explicit invalidation on status
    // change), so "no-store" here is cheap — it hits Redis, not the DB.
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
    return { username: data.username, domain_status: data.domain_status };
  } catch {
    return null;
  }
}

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

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
  const segments = rawSegments;
  const canonical = `https://${host}${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
  const alternatesWithOptionalRss = (rssEnabled: boolean) =>
    rssEnabled
      ? { canonical, types: { "application/rss+xml": `https://${host}/rss.xml` } }
      : { canonical };

  // Blog post: /blog/[slug]
  if (segments[0] === "blog" && segments[1]) {
    const postSlug = segments[1];
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

  // Profile page
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

// Preconnect to image CDN for faster mobile image loading
export const viewport = {
  themeColor: "#f4f5f8",
  other: {
    preconnect: ["https://images.articurls.com"],
    "dns-prefetch": "https://images.articurls.com",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomDomainPage({ params }: Props) {
  // Current URL for structured data
  const h = await headers();
  const runtimeHosts = buildRuntimeHostsFromEnv();
  const host = resolveTenantHostFromHeaders(h, runtimeHosts);

  if (isInternalHost(host, runtimeHosts)) notFound();

  // Check domain status and handle lifecycle
  const domainInfo = await resolveDomainInfo(host);
  
  if (!domainInfo) {
    notFound();
  }

  // Handle expired domains with permanent redirect back to articurls
  if (domainInfo.domain_status === "expired") {
    const { slug: segments = [] } = await params;
    const pathname = segments.length === 0 ? "" : `/${segments.join("/")}`;
    const redirectUrl = `${UGS_ORIGIN}/${encodeURIComponent(domainInfo.username)}${pathname}`;
    permanentRedirect(redirectUrl);
  }

  // Do not serve content before verification — redirect to articurls
  if (domainInfo.domain_status === "pending") {
    const { slug: segments = [] } = await params;
    const pathname = segments.length === 0 ? "" : `/${segments.join("/")}`;
    redirect(`${UGS_ORIGIN}/${encodeURIComponent(domainInfo.username)}${pathname}`);
  }

  // Any other unrecognised status (none, etc.) — 404
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    notFound();
  }

  const username = domainInfo.username;
  const { slug: segments = [] } = await params;
  const siteOrigin = `https://${host}`;

  // ── Blog post: /blog/[slug] ────────────────────────────────────────────────
  if (segments[0] === "blog") {
    if (!segments[1]) notFound();
    const postSlug = segments[1];

    const [blog, author, pages, categories] = await Promise.all([
      loadBlog(username, postSlug),
      loadUser(username),
      loadPages(username),
      loadCategories(username),
    ]);

    if (!blog || !author) notFound();

    const navBlogName = (author.nav_blog_name || "").trim() || "My Blog";
    const blogNameSize = normalizeNavBlogNameSize(author.nav_blog_name_size);
    const containerSpacing = author.navbar_enabled
      ? "mx-auto max-w-3xl px-[26px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
      : "mx-auto max-w-3xl px-[26px] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";
    // On custom domain, nav links are relative (no /username prefix)
    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showSubscriberCollection = author.subscriber_collection_enabled === true;
    const desktopLinks = author.nav_menu_enabled ? catLinks : [];
    const hasMobileNav =
      (author.nav_menu_enabled && categories.length > 0) || showSubscriberCollection;

    const currentUrl = `https://${host}/blog/${encodeURIComponent(postSlug)}`;

    return (
      <article className="min-h-screen bg-white">
        <StructuredData data={generateBlogPostingSchema(blog, author, currentUrl)} />
        <main className={containerSpacing}>
          {author.navbar_enabled ? (
            <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  userName={author.user_name}
                  authorName={author.name}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={author.nav_menu_enabled ? catLinks : []}
                  userName={author.user_name}
                  authorName={author.name}
                  showSubscribeAction={showSubscriberCollection}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}
          <div className="flex items-center justify-between">
            <Link href={getPublicProfileUrl(username, { customDomain: true })} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Back
            </Link>
            <BlogPostShareMenu url={currentUrl} title={blog.title} />
          </div>
          <header className="mt-6 sm:mt-8">
            <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              {blog.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={getPublicProfileUrl(username, { customDomain: true })}
                className="inline-flex items-center rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <span className="truncate">{author.name}</span>
              </Link>
              {blog.published_at && (
                <time className="text-sm text-muted-foreground" dateTime={blog.published_at}>
                  {new Date(blog.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </time>
              )}
            </div>
          </header>
          <div className="mt-12">
            <div className="prose-blog" dangerouslySetInnerHTML={{ __html: transformHtmlImages(sanitizeHtml(blog.content)) }} />
          </div>
          {showSubscriberCollection ? (
            <div className="mt-14">
              <SubscribeToAuthor userName={author.user_name} authorName={author.name} />
            </div>
          ) : null}
          <PublicProfileFooter user={author} />
          <PublicSiteFooter user={author} pages={pages} useCustomDomain />
        </main>
        {author.show_articurls_watermark !== false ? (
          <a
            href={MARKETING_ORIGIN}
            className="fixed bottom-4 right-[max(1rem,calc((100vw-48rem)/2+1rem))] z-20 rounded-lg border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
          >
            Made with <span className="font-semibold">Articurls</span>
          </a>
        ) : null}
      </article>
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
    const mainSpacing = user.navbar_enabled
      ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
      : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const desktopLinks = user.nav_menu_enabled ? catLinks : [];
    const hasMobileNav =
      (user.nav_menu_enabled && categories.length > 0) || showSubscriberCollection;

    const currentUrl = `https://${host}/page/${encodeURIComponent(pageSlug)}`;

    return (
      <div className="min-h-screen bg-white">
        <main className={mainSpacing}>
          <StructuredData data={generateWebPageSchema(page, user, currentUrl)} />
          {user.navbar_enabled ? (
            <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  userName={user.user_name}
                  authorName={user.name}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={user.nav_menu_enabled ? catLinks : []}
                  userName={user.user_name}
                  authorName={user.name}
                  showSubscribeAction={showSubscriberCollection}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}

          <div className="flex items-center justify-between">
            <Link
              href={getPublicProfileUrl(username, { customDomain: true })}
              className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              Back
            </Link>
            <BlogPostShareMenu url={currentUrl} title={page.title} />
          </div>

          <header className="mt-6 sm:mt-8">
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          </header>
          <article className="mt-12">
            <div className="prose-blog" dangerouslySetInnerHTML={{ __html: transformHtmlImages(sanitizeHtml(page.content)) }} />
          </article>
          <PublicSiteFooter user={user} pages={pages} useCustomDomain />
        </main>
        {user.show_articurls_watermark !== false ? (
          <a
            href={MARKETING_ORIGIN}
            className="fixed bottom-4 right-[max(1rem,calc((100vw-48rem)/2+1rem))] z-20 rounded-lg border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
          >
            Made with <span className="font-semibold">Articurls</span>
          </a>
        ) : null}
      </div>
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
    const mainSpacing = user.navbar_enabled
      ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
      : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showSubscriberCollection = user.subscriber_collection_enabled === true;
    const desktopLinks = user.nav_menu_enabled
      ? categories.map((c) => ({
          href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
          label: c.name,
          active: c.slug === categorySlug,
        }))
      : [];
    const hasMobileNav =
      (user.nav_menu_enabled && categories.length > 0) || showSubscriberCollection || blogs.length > 0;

    const currentUrl = `https://${host}/category/${encodeURIComponent(categorySlug)}`;

    return (
      <div className="min-h-screen bg-white">
        <StructuredData data={generateCollectionPageSchema(data.category, user, currentUrl)} />
        <main className={mainSpacing}>
          <SearchProvider>
            {user.navbar_enabled ? (
              <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
                <div className="hidden w-full sm:block">
                  <PublicDesktopNav
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, { customDomain: true })}
                    nameSize={blogNameSize}
                    links={desktopLinks}
                    showSubscribe={showSubscriberCollection}
                    showSearch={blogs.length > 0}
                    userName={user.user_name}
                    authorName={user.name}
                  />
                </div>
                <div className="sm:hidden">
                  <PublicMobileNavMenu
                    title={navBlogName}
                    titleHref={getPublicProfileUrl(username, { customDomain: true })}
                    nameSize={blogNameSize}
                    links={user.nav_menu_enabled ? catLinks : []}
                    userName={user.user_name}
                    authorName={user.name}
                    showSubscribeAction={showSubscriberCollection}
                    showSearch={blogs.length > 0}
                    showMenuButton={hasMobileNav}
                  />
                </div>
              </header>
            ) : null}

            <div className="mb-6 flex items-center gap-3">
              <Link
                href={getPublicProfileUrl(username, { customDomain: true })}
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
                useCustomDomain
                siteOrigin={siteOrigin}
              />
            ) : (
              <div className="rounded-xl border border-border/70 bg-white px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
              </div>
            )}
            <PublicSiteFooter user={user} pages={pages} useCustomDomain />
          </SearchProvider>
        </main>
        {user.show_articurls_watermark !== false ? (
          <a
            href={MARKETING_ORIGIN}
            className="fixed bottom-4 right-[max(1rem,calc((100vw-48rem)/2+1rem))] z-20 rounded-lg border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
          >
            Made with <span className="font-semibold">Articurls</span>
          </a>
        ) : null}
      </div>
    );
  }

  // ── Profile / home ────────────────────────────────────────────────────────
  // Only render homepage for the root path — any other unrecognised segment is a 404
  if (segments.length > 0) notFound();

  const [user, blogs, pages, categories] = await Promise.all([
    loadUser(username),
    loadBlogs(username),
    loadPages(username),
    loadCategories(username),
  ]);

  if (!user) notFound();

  const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
  const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  // On custom domain, nav links are relative
  const catLinks = categories.map((c) => ({
    href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
    label: c.name,
  }));
  const showSubscriberCollection = user.subscriber_collection_enabled === true;
  const desktopLinks = user.nav_menu_enabled ? catLinks : [];
  const hasMobileNav =
    (user.nav_menu_enabled && categories.length > 0) || showSubscriberCollection || blogs.length > 0;

  // Rewrite blog hrefs to be relative for custom domain
  const blogsWithRelativeHrefs = blogs;

  const currentUrl = `https://${host}`;

  return (
    <div className="min-h-screen bg-white">
        <StructuredData data={generateWebSiteSchema(user, currentUrl)} />
      <main className={mainSpacing}>
        <SearchProvider>
          {user.navbar_enabled ? (
            <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
              <div className="hidden w-full sm:block">
                <PublicDesktopNav
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={desktopLinks}
                  showSubscribe={showSubscriberCollection}
                  showSearch={blogs.length > 0}
                  userName={user.user_name}
                  authorName={user.name}
                />
              </div>
              <div className="sm:hidden">
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  nameSize={blogNameSize}
                  links={user.nav_menu_enabled ? catLinks : []}
                  userName={user.user_name}
                  authorName={user.name}
                  showSubscribeAction={showSubscriberCollection}
                  showSearch={blogs.length > 0}
                  showMenuButton={hasMobileNav}
                />
              </div>
            </header>
          ) : null}
          <PublicBlogListSearch
            blogs={blogsWithRelativeHrefs}
            username={username}
            user={user}
            useCustomDomain
            siteOrigin={siteOrigin}
          />
          <PublicSiteFooter user={user} pages={pages} useCustomDomain />
        </SearchProvider>
      </main>
      {user.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-[max(1rem,calc((100vw-48rem)/2+1rem))] z-20 rounded-lg border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
        >
          Made with <span className="font-semibold">Articurls</span>
        </a>
      ) : null}
      </div>
  );
}
