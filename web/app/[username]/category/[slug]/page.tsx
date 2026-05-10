import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage, Category, PublicCategoryBlogsResponse } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicDesktopNav } from "@/components/public-desktop-nav";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveCanonicalUrl, getCustomDomainRedirectUrl } from "@/lib/custom-domain-redirect";
import { faviconIcons } from "@/lib/favicon";
import { resolveBlogPreviewImage } from "@/lib/blog-images";
import { normalizeNavBlogNameSize } from "@/lib/nav-blog-name";

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

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (res.status === 404) return null;
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

async function loadCategoryBlogs(username: string, slug: string): Promise<PublicCategoryBlogsResponse | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/category/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE } }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) {
    return { robots: { index: false, follow: true } };
  }
  const user = await loadUser(username);
  if (!user) return { title: "Not found", robots: { index: false, follow: true } };
  const data = await loadCategoryBlogs(username, slug);
  const catName = data?.category?.name || slug;
  const marketingPath = `/${encodeURIComponent(user.user_name)}/category/${encodeURIComponent(slug)}`;
  const customDomainPath = `/category/${encodeURIComponent(slug)}`;
  const canonical = resolveCanonicalUrl(user, MARKETING_ORIGIN, marketingPath, customDomainPath);
  const title = `${catName} — ${user.name}`;
  const description = `Browse all ${catName} posts by ${user.name} on Articurls.`;
  const siteName = resolveUserSiteName(user);
  const ogImage =
    (data?.blogs?.[0] ? resolveBlogPreviewImage(data.blogs[0]) : "") ||
    resolveUserOgImage(user);
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    icons: faviconIcons(user),
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName,
      images: ogImage ? [{ url: ogImage, alt: `${catName} cover image` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicCategoryPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const user = await loadUser(username);
  if (!user) notFound();
  if (user.user_name.toLowerCase() !== username.toLowerCase()) {
    permanentRedirect(`/${encodeURIComponent(user.user_name)}/category/${slug}`);
  }

  // 301 redirect to custom domain when active — strongest SEO consolidation signal
  const customRedirect = getCustomDomainRedirectUrl(user, `/category/${encodeURIComponent(slug)}`);
  if (customRedirect) permanentRedirect(customRedirect);

  const [data, pages, categories] = await Promise.all([
    loadCategoryBlogs(username, slug),
    loadPages(username),
    loadCategories(username),
  ]);

  if (!data) notFound();
  const blogs = data.blogs;
  const categoryName = data.category.name;

  const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  const catLinks = categories.map((c) => ({ href: getPublicCategoryUrl(username, c.slug), label: c.name }));
  const showSubscriberCollection = user.subscriber_collection_enabled === true;
  const desktopLinks = user.nav_menu_enabled
    ? categories.map((c) => ({
        href: getPublicCategoryUrl(username, c.slug),
        label: c.name,
        active: c.slug === slug,
      }))
    : [];
  const hasMobileNav =
    (user.nav_menu_enabled && categories.length > 0) || showSubscriberCollection;
  const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);

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

        <div className="mb-6 flex items-center gap-3">
          <Link
            href={getPublicProfileUrl(username)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← All posts
          </Link>
          <span className="text-sm text-muted-foreground select-none">·</span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{categoryName}</h1>
        </div>

        {blogs.length > 0 ? (
          <PublicBlogListSearch blogs={blogs} username={username} user={user} hideFeatured />
        ) : (
          <div className="rounded-xl border border-border/70 bg-white px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          </div>
        )}
        <PublicSiteFooter user={user} pages={pages} />
      </main>
      {user.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-4 z-20 rounded-full border border-border/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80"
        >
          Made with Articurls
        </a>
      ) : null}
    </div>
  );
}
