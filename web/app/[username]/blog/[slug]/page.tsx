import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicProfileFooter } from "@/components/public-profile-footer";
import { PublicBlogViewTracker } from "@/components/public-blog-view-tracker";
import { PublicDesktopNav } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { resolveBlogPreviewImage } from "@/lib/blog-images";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveCanonicalUrl, getCustomDomainRedirectUrl } from "@/lib/custom-domain-redirect";
import { excerptFromHtml } from "@/lib/text";
import { faviconIcons } from "@/lib/favicon";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { shouldIndexOnMarketingHost } from "@/lib/seo";
import { fetchSeoEligibility } from "@/lib/seo-data";

type Props = { params: Promise<{ username: string; slug: string }> };

const REVALIDATE = 300;

function resolveUserSiteName(user: PublicUser | null | undefined): string {
  return (user?.nav_blog_name || "").trim() || "My Blog";
}

function resolveUserOgImage(user: PublicUser | null | undefined): string | undefined {
  const profileImage = assetUrl(user?.profile_image_url);
  if (profileImage) return profileImage;
  return undefined;
}

async function loadBlog(username: string, slug: string): Promise<PublicBlog | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}`, {
    next: { revalidate: REVALIDATE },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function loadPages(username: string): Promise<UserPage[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return [];
  return res.json();
}

async function loadCategories(username: string): Promise<Category[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) {
    return { robots: { index: false, follow: true } };
  }
  const blog = await loadBlog(username, slug);
  if (!blog) return { title: "Not found", robots: { index: false, follow: true } };
  const author = await loadUser(username);
  const seoEligibility = author ? await fetchSeoEligibility(author.user_name || username) : null;
  const canonicalUserName = author?.user_name || username;
  const marketingPath = `/${encodeURIComponent(canonicalUserName)}/blog/${encodeURIComponent(slug)}`;
  const customDomainPath = `/blog/${encodeURIComponent(slug)}`;
  const canonical = author
    ? resolveCanonicalUrl(author, MARKETING_ORIGIN, marketingPath, customDomainPath)
    : `${MARKETING_ORIGIN}${marketingPath}`;
  const title = blog.meta_title || blog.title;
  const description = blog.meta_description || blog.excerpt || excerptFromHtml(blog.content) || undefined;
  const ogImage =
    resolveBlogPreviewImage(blog) || resolveUserOgImage(author);
  const siteName = resolveUserSiteName(author);
  const shouldIndex = !!author && !!seoEligibility && shouldIndexOnMarketingHost({
    is_pro: seoEligibility.is_pro,
    domain_status: author.domain_status,
  });
  const feedUrl = shouldIndex && author && author.rss_enabled !== false
    ? `${MARKETING_ORIGIN}/${encodeURIComponent(author.user_name)}/rss.xml`
    : undefined;
  const alternates = feedUrl
    ? { canonical, types: { "application/rss+xml": feedUrl } }
    : { canonical };
  return {
    title,
    description,
    robots: { index: shouldIndex, follow: true },
    alternates,
    icons: faviconIcons(author),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName,
      images: ogImage ? [{ url: ogImage, alt: `${title} cover image` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicBlogPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const [blog, author, pages, categories] = await Promise.all([
    loadBlog(username, slug),
    loadUser(username),
    loadPages(username),
    loadCategories(username),
  ]);
  if (!blog || !author) notFound();
  if (author.user_name.toLowerCase() !== username.toLowerCase()) {
    permanentRedirect(`/${encodeURIComponent(author.user_name)}/blog/${encodeURIComponent(slug)}`);
  }

  // 301 redirect to custom domain when active — strongest SEO consolidation signal
  const customRedirect = getCustomDomainRedirectUrl(author, `/blog/${encodeURIComponent(slug)}`);
  if (customRedirect) permanentRedirect(customRedirect);

  const navBlogName = (author.nav_blog_name || "").trim() || "My Blog";
  const containerSpacing = author.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";
  const catLinks = categories.map((c) => ({ href: getPublicCategoryUrl(username, c.slug), label: c.name }));
  const showSubscriberCollection = author.subscriber_collection_enabled === true;
  const desktopLinks = author.nav_menu_enabled ? catLinks : [];
  const hasMobileNav =
    (author.nav_menu_enabled && categories.length > 0) || showSubscriberCollection;
  const blogNameSize = normalizeNavBlogNameSize(author.nav_blog_name_size);

  return (
    <article className="min-h-screen bg-white">
      <div className={containerSpacing}>
        <PublicBlogViewTracker userName={username} slug={slug} />
        {author.navbar_enabled ? (
          <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={navBlogName}
                titleHref={getPublicProfileUrl(username)}
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
                titleHref={getPublicProfileUrl(username)}
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
        <Link
          href={getPublicProfileUrl(username)}
          className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
        <header className="mt-6 sm:mt-8">
          <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {blog.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              href={getPublicProfileUrl(username)}
              className="inline-flex items-center gap-3 rounded-md -mx-1 px-1 py-0.5 text-muted-foreground hover:text-foreground"
            >
              {author.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={assetUrl(author.profile_image_url)}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border/70"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full bg-muted ring-1 ring-border/70" aria-hidden />
              )}
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 truncate text-sm">
                <span className="truncate">{author.name}</span>
              </span>
            </Link>
            {blog.published_at && (
              <time className="text-sm text-muted-foreground" dateTime={blog.published_at}>
                {new Date(blog.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
        </header>
        <div className="mt-12">
          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: blog.content }} />
        </div>
        {showSubscriberCollection ? (
          <div className="mt-14 border-t border-border/80 pt-6">
            <SubscribeToAuthor userName={author.user_name} authorName={author.name} />
          </div>
        ) : null}
        <PublicProfileFooter user={author} />
        <PublicSiteFooter user={author} pages={pages} />
      </div>
      {author.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-4 z-20 rounded-full border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
        >
          Made with Articurls
        </a>
      ) : null}
    </article>
  );
}
