import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, UGS_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicDesktopNav } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveCanonicalUrl, getCustomDomainRedirectUrl } from "@/lib/custom-domain-redirect";
import { faviconIcons } from "@/lib/favicon";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { excerptFromHtml } from "@/lib/text";
import { shouldIndexOnUgcDomain } from "@/lib/seo";
import { fetchSeoEligibility } from "@/lib/seo-data";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { transformHtmlImages } from "@/lib/image-transform";
import { ChevronLeft } from "lucide-react";
import { BlogPostShareMenu } from "@/components/blog-post-share-menu";
import { StructuredData } from "@/components/structured-data";
import { generateWebPageSchema } from "@/lib/structured-data";

type Props = { params: Promise<{ username: string; slug: string }> };

export const dynamic = "force-dynamic";

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

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function loadPages(username: string): Promise<UserPage[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadPage(username: string, slug: string): Promise<UserPage | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/page/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
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
  const page = await loadPage(username, slug);
  if (!page) return { title: "Not found", robots: { index: false, follow: true } };
  const user = await loadUser(username);
  const seoEligibility = user ? await fetchSeoEligibility(user.user_name || username) : null;
  const canonicalUserName = user?.user_name || username;
  const marketingPath = `/${encodeURIComponent(canonicalUserName)}/page/${encodeURIComponent(slug)}`;
  const customDomainPath = `/page/${encodeURIComponent(slug)}`;
  const canonical = user
    ? resolveCanonicalUrl(user, UGS_ORIGIN, marketingPath, customDomainPath)
    : `${UGS_ORIGIN}${marketingPath}`;
  const title = page.meta_title || page.title;
  const description = resolvePageDescription(page);
  const siteName = resolveUserSiteName(user);
  const ogImage = resolveUserOgImage(user);
  const shouldIndex = !!user && !!seoEligibility && shouldIndexOnUgcDomain({
    is_pro: seoEligibility.is_pro,
    domain_status: user.domain_status,
  });
  const feedUrl = shouldIndex && user && user.rss_enabled !== false
    ? `${UGS_ORIGIN}/${encodeURIComponent(user.user_name)}/rss.xml`
    : undefined;
  const alternates = feedUrl
    ? { canonical, types: { "application/rss+xml": feedUrl } }
    : { canonical };
  return {
    title,
    description,
    robots: { index: shouldIndex, follow: true },
    alternates,
    icons: faviconIcons(user),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
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

export default async function PublicCustomPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const [user, pages, categories, page] = await Promise.all([loadUser(username), loadPages(username), loadCategories(username), loadPage(username, slug)]);
  if (!user || !page) notFound();
  if (user.user_name.toLowerCase() !== username.toLowerCase()) {
    permanentRedirect(`/${encodeURIComponent(user.user_name)}/page/${encodeURIComponent(slug)}`);
  }

  // 301 redirect to custom domain when active — strongest SEO consolidation signal
  const customRedirect = getCustomDomainRedirectUrl(user, `/page/${encodeURIComponent(slug)}`);
  if (customRedirect) permanentRedirect(customRedirect);

  const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-6xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-6xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  const catLinks = categories.map((c) => ({ href: getPublicCategoryUrl(username, c.slug), label: c.name }));
  const showSubscriberCollection = user.subscriber_collection_enabled === true;
  const desktopLinks = user.nav_menu_enabled ? catLinks : [];
  const hasMobileNav =
    (user.nav_menu_enabled && categories.length > 0) || showSubscriberCollection;
  const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);
  
  // Define canonical URL for structured data
  const marketingPath = `/${encodeURIComponent(user.user_name)}/page/${encodeURIComponent(slug)}`;
  const canonical = resolveCanonicalUrl(user, UGS_ORIGIN, marketingPath, `/page/${slug}`);

  return (
    <div className="min-h-screen bg-white">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
            <div className="hidden w-full sm:block">
              <PublicDesktopNav
                title={navBlogName}
                titleHref={getPublicProfileUrl(username)}
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
                titleHref={getPublicProfileUrl(username)}
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

        <StructuredData data={page && user ? generateWebPageSchema(page, user, canonical) : null} />
        <div className="flex items-center justify-between">
          <Link
            href={getPublicProfileUrl(username)}
            className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Back
          </Link>
          <BlogPostShareMenu
            url={`${UGS_ORIGIN}/${encodeURIComponent(username)}/page/${encodeURIComponent(slug)}`}
            title={page.title}
          />
        </div>

        <header className="mt-6 sm:mt-8">
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        </header>
        <article className="mt-12">
          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: transformHtmlImages(sanitizeHtml(page.content)) }} />
        </article>
        <PublicSiteFooter user={user} pages={pages} />
      </main>
      {user.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-[max(1rem,calc((100vw-72rem)/2+1rem))] z-20 rounded-lg border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
        >
          Made with <span className="font-semibold">Articurls</span>
        </a>
      ) : null}
    </div>
  );
}
