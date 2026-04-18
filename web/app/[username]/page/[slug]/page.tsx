import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicUser, UserPage } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicProfileFooter } from "@/components/public-profile-footer";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) return {};
  const page = await loadPage(username, slug);
  if (!page) return { title: "Not found" };
  const canonical = `${MARKETING_ORIGIN}/${encodeURIComponent(username)}/page/${encodeURIComponent(slug)}`;
  return {
    title: page.title,
    alternates: { canonical },
  };
}

export default async function PublicCustomPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const [user, pages, page] = await Promise.all([loadUser(username), loadPages(username), loadPage(username, slug)]);
  if (!user || !page) notFound();
  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <Link href={`/${username}`} className="truncate text-lg font-semibold hover:underline">
                {navBlogName}
              </Link>
              <div className="hidden items-center gap-3 sm:flex">
                {user.nav_menu_enabled && pages.length > 0 ? (
                  pages.map((p) => (
                    <Link key={p.page_id} href={`/${username}/page/${p.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
                      {p.title}
                    </Link>
                  ))
                ) : null}
                <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
              </div>
            </div>
          </section>
        ) : null}

        <article className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          <div className="whitespace-pre-wrap text-muted-foreground">{page.content}</div>
        </article>
        <PublicProfileFooter user={user} />
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
