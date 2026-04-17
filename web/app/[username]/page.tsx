import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { MdVerified } from "react-icons/md";
import { Menu } from "lucide-react";
import { PublicProfileFooter } from "@/components/public-profile-footer";

/** Material `MdVerified` — sized in `em` so it stays centered with the heading text. */
function VerifiedBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center leading-none"
      title="Verified"
      aria-label="Verified"
    >
      <MdVerified
        className="block h-[0.92em] w-[0.92em] text-[#1D9BF0] drop-shadow-[0_2px_10px_rgba(29,155,240,0.45)] dark:text-[#38bdf8]"
        aria-hidden
      />
    </span>
  );
}

type Props = { params: Promise<{ username: string }> };

async function loadUser(username: string): Promise<PublicUser | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
}

async function loadBlogs(username: string): Promise<PublicBlog[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blogs`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadPages(username: string): Promise<UserPage[]> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (isReservedUsername(username)) return {};
  const user = await loadUser(username);
  if (!user) return { title: "Not found" };
  const canonical = `${MARKETING_ORIGIN}/${encodeURIComponent(username)}`;
  return {
    title: user.seo_title || `${user.name} — Articurls`,
    description: user.seo_description || undefined,
    alternates: { canonical },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  if (isReservedUsername(username)) notFound();

  const user = await loadUser(username);
  if (!user) notFound();

  const blogs = await loadBlogs(username);
  const pages = await loadPages(username);
  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="hidden items-center justify-between gap-4 sm:flex">
              <p className="truncate text-lg font-semibold">{navBlogName}</p>
              <div className="flex min-w-0 items-center gap-4">
                {user.nav_menu_enabled ? (
                  pages.length > 0 ? (
                    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                      {pages.map((p) => (
                        <Link key={p.page_id} href={`/${username}/page/${p.slug}`} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
                          {p.title}
                        </Link>
                      ))}
                    </nav>
                  ) : null
                ) : null}
                <div className="shrink-0">
                  <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                </div>
              </div>
            </div>
            <div className="sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-lg font-semibold">{navBlogName}</p>
                <details className="relative">
                  <summary className="flex h-9 w-9 list-none items-center justify-center rounded-md border border-border text-muted-foreground [&::-webkit-details-marker]:hidden">
                    <Menu className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-md">
                    <div className="space-y-1">
                      {user.nav_menu_enabled ? (
                        pages.length > 0 ? (
                          pages.map((p) => (
                            <Link key={p.page_id} href={`/${username}/page/${p.slug}`} className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                              {p.title}
                            </Link>
                          ))
                        ) : null
                      ) : null}
                    </div>
                    <div className="mt-2 border-t border-border pt-2">
                      <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </section>
        ) : null}
        <section className="mt-10 sm:mt-12">
          <ul className="divide-y divide-border/80">
            {blogs.map((b) => (
              <li key={b.blog_id} className="py-8 first:pt-0">
                <Link href={`/${username}/blog/${b.slug}`} className="group block rounded-xl py-1 transition-colors hover:bg-muted/30">
                  <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4 sm:text-xl">
                    {b.title}
                  </h3>
                  {b.excerpt && <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>}
                  {b.published_at && (
                    <time className="mt-3 block text-xs text-muted-foreground" dateTime={b.published_at}>
                      {new Date(b.published_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          {blogs.length === 0 && <p className="text-muted-foreground">No published posts yet.</p>}
        </section>
        <PublicProfileFooter user={user} />
      </main>
      <a
        href={MARKETING_ORIGIN}
        className="fixed bottom-4 right-4 z-20 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        Made with Articurls
      </a>
    </div>
  );
}
