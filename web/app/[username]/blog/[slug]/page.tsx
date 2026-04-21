import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicBlogAds, PublicUser, UserPage } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { Menu } from "lucide-react";
import { injectAdsIntoHtml } from "@/lib/ad-injection";
import { AdSlot } from "@/components/ad-slot";
import { PublicProfileFooter } from "@/components/public-profile-footer";
import { VerifiedBadge } from "@/components/verified-badge";
import { PublicBlogViewTracker } from "@/components/public-blog-view-tracker";

type Props = { params: Promise<{ username: string; slug: string }> };

async function loadBlog(username: string, slug: string): Promise<PublicBlog | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}`, {
    cache: "no-store",
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
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/pages`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function loadBlogAds(username: string, slug: string): Promise<PublicBlogAds | null> {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}/ads`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) return {};
  const blog = await loadBlog(username, slug);
  if (!blog) return { title: "Not found" };
  const canonical = `${MARKETING_ORIGIN}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}`;
  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || undefined,
    alternates: { canonical },
  };
}

export default async function PublicBlogPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const [blog, author, pages, adConfig] = await Promise.all([
    loadBlog(username, slug),
    loadUser(username),
    loadPages(username),
    loadBlogAds(username, slug),
  ]);
  if (!blog || !author) notFound();
  const navBlogName = (author.nav_blog_name || "").trim() || `${author.name}'s Blog`;
  const containerSpacing = author.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";
  const adSegments =
    adConfig?.enabled && adConfig.ad_code
      ? injectAdsIntoHtml(blog.content, adConfig.ad_frequency, 4)
      : [{ type: "html" as const, html: blog.content }];

  return (
    <article className="min-h-screen bg-background">
      <div className={containerSpacing}>
        <PublicBlogViewTracker userName={username} slug={slug} />
        {author.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className="hidden items-center justify-between gap-4 sm:flex">
              <Link href={`/${username}`} className="truncate text-lg font-semibold hover:underline">
                {navBlogName}
              </Link>
              <div className="flex min-w-0 items-center gap-4">
                {author.nav_menu_enabled ? (
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
                <SubscribeToAuthor mode="dialog" userName={author.user_name} authorName={author.name} />
              </div>
            </div>
            <div className="sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/${username}`} className="truncate text-lg font-semibold hover:underline">
                  {navBlogName}
                </Link>
                <details className="group relative">
                  <summary className="flex h-9 w-9 list-none items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted/70 hover:text-foreground group-open:border-primary/30 group-open:bg-primary/[0.08] group-open:text-primary [&::-webkit-details-marker]:hidden">
                    <Menu className="h-4 w-4 transition-transform duration-200 group-open:scale-105" />
                  </summary>
                  <div className="absolute right-0 z-20 mt-2.5 w-[min(13.5rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-border/70 bg-background/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-background/85">
                    <div className="space-y-1.5">
                      {author.nav_menu_enabled ? (
                        pages.length > 0 ? (
                          pages.map((p) => (
                            <Link
                              key={p.page_id}
                              href={`/${username}/page/${p.slug}`}
                              className="block rounded-lg px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {p.title}
                            </Link>
                          ))
                        ) : null
                      ) : null}
                    </div>
                    <div
                      className={`mt-2 pt-2 ${author.nav_menu_enabled && pages.length > 0 ? "border-t border-border/60" : ""}`}
                    >
                      <SubscribeToAuthor
                        mode="dialog"
                        userName={author.user_name}
                        authorName={author.name}
                        triggerClassName="h-8 min-h-8 w-full rounded-md px-3 text-xs font-medium"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </section>
        ) : null}
        <Link
          href={`/${username}`}
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
              href={`/${author.user_name}`}
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
                {author.verification_tick ? <VerifiedBadge /> : null}
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
          {adSegments.map((segment, idx) =>
            segment.type === "html" ? (
              <div key={`html-${idx}`} className="prose-blog" dangerouslySetInnerHTML={{ __html: segment.html }} />
            ) : adConfig?.ad_code ? (
              <AdSlot key={segment.key} slotId={segment.key} adCode={adConfig.ad_code} slotType={segment.slotType} />
            ) : null
          )}
        </div>
        <div className="mt-14 border-t border-border/80 pt-6">
          <SubscribeToAuthor userName={author.user_name} authorName={author.name} />
        </div>
        <PublicProfileFooter user={author} />
      </div>
      {author.show_articurls_watermark !== false ? (
        <a
          href={MARKETING_ORIGIN}
          className="fixed bottom-4 right-4 z-20 rounded-full border border-border/80 bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
        >
          Made with Articurls
        </a>
      ) : null}
    </article>
  );
}
