import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveCanonicalUrl, getCustomDomainRedirectUrl } from "@/lib/custom-domain-redirect";
import { faviconIcons } from "@/lib/favicon";
import { navBlogNameClassName, normalizeNavBlogNameSize } from "@/lib/nav-blog-name";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ username: string }> };

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

async function loadBlogs(username: string): Promise<PublicBlog[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blogs`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) return [];
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
  const { username } = await params;
  if (isReservedUsername(username)) {
    return { robots: { index: false, follow: true } };
  }
  const user = await loadUser(username);
  if (!user) return { title: "Not found", robots: { index: false, follow: true } };
  const marketingPath = `/${encodeURIComponent(user.user_name)}`;
  const canonical = resolveCanonicalUrl(user, MARKETING_ORIGIN, marketingPath, "/");
  const title = user.meta_title || `${user.name} — Articurls`;
  const description = user.meta_description || undefined;
  const siteName = resolveUserSiteName(user);
  const ogImage = resolveUserOgImage(user);
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
      images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  if (isReservedUsername(username)) notFound();

  const user = await loadUser(username);
  if (!user) notFound();
  if (user.user_name.toLowerCase() !== username.toLowerCase()) {
    permanentRedirect(`/${encodeURIComponent(user.user_name)}`);
  }

  // 301 redirect to custom domain when active — strongest SEO consolidation signal
  const customRedirect = getCustomDomainRedirectUrl(user, "/");
  if (customRedirect) permanentRedirect(customRedirect);

  const blogs = await loadBlogs(username);
  const pages = await loadPages(username);
  const categories = await loadCategories(username);
  const navBlogName = (user.nav_blog_name || "").trim() || "My Blog";
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  const catLinks = categories.map((c) => ({ href: getPublicCategoryUrl(username, c.slug), label: c.name }));
  const showDesktopInline = categories.length > 0 && categories.length <= 5;
  const showDesktopMenuIcon = categories.length > 5;
  const showSubscriberCollection = user.subscriber_collection_enabled === true;
  const blogNameSize = normalizeNavBlogNameSize(user.nav_blog_name_size);

  return (
    <div className="min-h-screen bg-white">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <header className="mb-8 border-b border-border/70 pb-4 sm:mb-10 sm:pb-5" data-public-nav>
            <div className={`hidden flex-wrap items-center justify-center gap-x-6 gap-y-3 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
              <Link
                href={getPublicProfileUrl(username)}
                className={cn(
                  "flex min-h-9 min-w-0 max-w-full shrink-0 items-center truncate hover:underline",
                  navBlogNameClassName(blogNameSize)
                )}
              >
                {navBlogName}
              </Link>
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-4">
                {user.nav_menu_enabled && showDesktopInline ? (
                  <nav className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {categories.map((c) => (
                      <Link key={c.category_id} href={getPublicCategoryUrl(username, c.slug)} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                ) : null}
                {showSubscriberCollection ? (
                  <div className="shrink-0">
                    <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                  </div>
                ) : null}
              </div>
            </div>
            <div className={showDesktopMenuIcon ? "" : "sm:hidden"}>
              <PublicMobileNavMenu
                title={navBlogName}
                titleHref={getPublicProfileUrl(username)}
                nameSize={blogNameSize}
                links={user.nav_menu_enabled ? catLinks : []}
                userName={user.user_name}
                authorName={user.name}
                showSubscribeAction={showSubscriberCollection}
              />
            </div>
          </header>
        ) : null}
        <PublicBlogListSearch blogs={blogs} username={username} user={user} siteOrigin={MARKETING_ORIGIN} />
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
