import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicUser, UserPage, Category } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";
import { resolveCanonicalUrl, getCustomDomainRedirectUrl } from "@/lib/custom-domain-redirect";

type Props = { params: Promise<{ username: string; slug: string }> };

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
  if (isReservedUsername(username)) return {};
  const page = await loadPage(username, slug);
  if (!page) return { title: "Not found" };
  const user = await loadUser(username);
  const canonicalUserName = user?.user_name || username;
  const marketingPath = `/${encodeURIComponent(canonicalUserName)}/page/${encodeURIComponent(slug)}`;
  const customDomainPath = `/page/${encodeURIComponent(slug)}`;
  const canonical = user
    ? resolveCanonicalUrl(user, MARKETING_ORIGIN, marketingPath, customDomainPath)
    : `${MARKETING_ORIGIN}${marketingPath}`;
  return {
    title: page.title,
    alternates: { canonical },
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

  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  const catLinks = categories.map((c) => ({ href: getPublicCategoryUrl(username, c.slug), label: c.name }));
  const showDesktopInline = categories.length > 0 && categories.length <= 5;
  const showDesktopMenuIcon = categories.length > 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className={`hidden items-center justify-between gap-4 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
              <Link href={getPublicProfileUrl(username)} className="truncate text-lg font-semibold hover:underline">
                {navBlogName}
              </Link>
              <div className="flex min-w-0 items-center gap-4">
                {user.nav_menu_enabled && showDesktopInline ? (
                  <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                    {categories.map((c) => (
                      <Link key={c.category_id} href={getPublicCategoryUrl(username, c.slug)} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                ) : null}
                <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
              </div>
            </div>
            <div className={showDesktopMenuIcon ? "" : "sm:hidden"}>
              <PublicMobileNavMenu
                title={navBlogName}
                titleHref={getPublicProfileUrl(username)}
                links={user.nav_menu_enabled ? catLinks : []}
                userName={user.user_name}
                authorName={user.name}
              />
            </div>
          </section>
        ) : null}

        <Link
          href={getPublicProfileUrl(username)}
          className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>

        <header className="mt-6 sm:mt-8">
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        </header>
        <article className="mt-4">
          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: page.content || "" }} />
        </article>
        <PublicSiteFooter user={user} pages={pages} />
      </main>
      {user.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-4 z-20 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          Made with Articurls
        </a>
      ) : null}
    </div>
  );
}
