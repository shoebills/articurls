import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage, Category, PublicCategoryBlogsResponse } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";

type Props = { params: Promise<{ username: string; slug: string }> };

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
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

async function loadCategoryBlogs(username: string, slug: string): Promise<PublicCategoryBlogsResponse | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/category/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) return {};
  const user = await loadUser(username);
  if (!user) return { title: "Not found" };
  const data = await loadCategoryBlogs(username, slug);
  const catName = data?.category?.name || slug;
  const canonical = `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}/category/${encodeURIComponent(slug)}`;
  return {
    title: `${catName} — ${user.name}`,
    description: `Browse all ${catName} posts by ${user.name} on Articurls.`,
    alternates: { canonical },
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

  const [data, pages, categories] = await Promise.all([
    loadCategoryBlogs(username, slug),
    loadPages(username),
    loadCategories(username),
  ]);

  if (!data) notFound();
  const blogs = data.blogs;
  const categoryName = data.category.name;

  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  const catLinks = categories.map((c) => ({ href: `/${username}/category/${c.slug}`, label: c.name }));
  const hasCategories = categories.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="hidden items-center justify-between gap-4 sm:flex">
              <p className="truncate text-lg font-semibold">{navBlogName}</p>
              <div className="flex min-w-0 items-center gap-4">
                {user.nav_menu_enabled && hasCategories ? (
                  <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                    {categories.map((c) => (
                      <Link
                        key={c.category_id}
                        href={`/${username}/category/${c.slug}`}
                        className={`whitespace-nowrap text-sm ${
                          c.slug === slug
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </nav>
                ) : null}
                <div className="shrink-0">
                  <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                </div>
              </div>
            </div>
            <div className="sm:hidden">
              <PublicMobileNavMenu
                title={navBlogName}
                links={user.nav_menu_enabled ? catLinks : []}
                userName={user.user_name}
                authorName={user.name}
              />
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/${username}`}
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
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          </div>
        )}
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
