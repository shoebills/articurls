import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import type { PublicBlog, PublicBlogAds, PublicUser, UserPage, Category, PublicCategoryBlogsResponse } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicMobileNavMenu } from "@/components/public-mobile-nav-menu";
import { PublicBlogListSearch } from "@/components/public-blog-list-search";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicProfileFooter } from "@/components/public-profile-footer";
import { VerifiedBadge } from "@/components/verified-badge";
import { PublicBlogViewTracker } from "@/components/public-blog-view-tracker";
import { AdSlot } from "@/components/ad-slot";
import { injectAdsIntoHtml } from "@/lib/ad-injection";
import { resolveBlogPreviewImage } from "@/lib/blog-images";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";

type Props = { params: Promise<{ slug?: string[] }> };

function normalizeCustomDomainSegments(segments: string[], username: string): string[] {
  if (segments[0]?.toLowerCase() === username.toLowerCase()) {
    return segments.slice(1);
  }
  return segments;
}

function canonicalUrlForCustomDomain(host: string, segments: string[]): string {
  return segments.length > 0 ? `https://${host}/${segments.join("/")}` : `https://${host}`;
}

// ── Data loaders ─────────────────────────────────────────────────────────────

async function resolveDomainInfo(host: string): Promise<{ username: string; domain_status: string } | null> {
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        cache: "no-store",
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

async function resolveUsername(host: string): Promise<string | null> {
  const info = await resolveDomainInfo(host);
  if (!info) return null;
  
  // Only allow "active" and "grace" status
  if (info.domain_status === "active" || info.domain_status === "grace") {
    return info.username;
  }
  
  return null;
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

async function loadBlogAds(username: string, slug: string): Promise<PublicBlogAds | null> {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(username)}/blog/${encodeURIComponent(slug)}/ads`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-original-host");
  if (!host) return {};

  const username = await resolveUsername(host);
  if (!username) return {};

  const { slug: rawSegments = [] } = await params;
  const segments = normalizeCustomDomainSegments(rawSegments, username);
  const canonical = canonicalUrlForCustomDomain(host, segments);

  // Blog post: /blog/[slug]
  if (segments[0] === "blog" && segments[1]) {
    const postSlug = segments[1];
    const [blog, author] = await Promise.all([loadBlog(username, postSlug), loadUser(username)]);
    if (!blog) return { title: "Not found" };
    return {
      title: blog.meta_title || blog.title,
      description: blog.meta_description || undefined,
      alternates: { canonical },
      openGraph: {
        images: [{ url: resolveBlogPreviewImage(blog, author?.use_default_preview_image ?? true) }],
      },
      twitter: {
        card: "summary_large_image",
        images: [resolveBlogPreviewImage(blog, author?.use_default_preview_image ?? true)],
      },
    };
  }

  if (segments[0] === "page" && segments[1]) {
    const page = await loadPage(username, segments[1]);
    if (!page) return { title: "Not found" };
    return {
      title: page.title,
      alternates: { canonical },
    };
  }

  if (segments[0] === "category" && segments[1]) {
    const [user, data] = await Promise.all([loadUser(username), loadCategoryBlogs(username, segments[1])]);
    if (!user || !data) return { title: "Not found" };
    const categoryName = data.category.name || segments[1];
    return {
      title: `${categoryName} — ${user.name}`,
      description: `Browse all ${categoryName} posts by ${user.name}.`,
      alternates: { canonical },
    };
  }

  // Profile page
  const user = await loadUser(username);
  if (!user) return { title: "Not found" };
  return {
    title: user.meta_title || `${user.name} — Articurls`,
    description: user.meta_description || undefined,
    alternates: { canonical },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomDomainPage({ params }: Props) {
  const h = await headers();
  const host = h.get("x-original-host");

  if (!host) notFound();

  // Check domain status and handle lifecycle
  const domainInfo = await resolveDomainInfo(host);
  
  if (!domainInfo) {
    notFound();
  }

  // Handle expired domains with 301 redirect
  if (domainInfo.domain_status === "expired") {
    const { slug: segments = [] } = await params;
    const pathname = segments.length === 0 ? "" : `/${segments.join("/")}`;
    const redirectUrl = `${MARKETING_ORIGIN}/${encodeURIComponent(domainInfo.username)}${pathname}`;
    redirect(redirectUrl);
  }

  const username = domainInfo.username;
  const { slug: rawSegments = [] } = await params;
  const segments = normalizeCustomDomainSegments(rawSegments, username);
  const siteOrigin = `https://${host}`;

  if (rawSegments.length !== segments.length) {
    permanentRedirect(canonicalUrlForCustomDomain(host, segments));
  }

  // ── Blog post: /blog/[slug] ────────────────────────────────────────────────
  if (segments[0] === "blog" && segments[1]) {
    const postSlug = segments[1];

    const [blog, author, pages, categories, adConfig] = await Promise.all([
      loadBlog(username, postSlug),
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadBlogAds(username, postSlug),
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

    // On custom domain, nav links are relative (no /username prefix)
    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showDesktopInline = categories.length > 0 && categories.length <= 5;
    const showDesktopMenuIcon = categories.length > 5;

    return (
      <article className="min-h-screen bg-background">
        <div className={containerSpacing}>
          <PublicBlogViewTracker userName={username} slug={postSlug} />
          {author.navbar_enabled ? (
            <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
              <div className={`hidden items-center justify-between gap-4 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
                <Link
                  href={getPublicProfileUrl(username, { customDomain: true })}
                  className="flex min-h-9 min-w-0 flex-1 items-center truncate text-lg font-semibold leading-tight hover:underline"
                >
                  {navBlogName}
                </Link>
                <div className="flex min-w-0 items-center gap-4">
                  {author.nav_menu_enabled && showDesktopInline ? (
                    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                      {categories.map((c) => (
                        <Link key={c.category_id} href={getPublicCategoryUrl(username, c.slug, { customDomain: true })} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
                          {c.name}
                        </Link>
                      ))}
                    </nav>
                  ) : null}
                  <SubscribeToAuthor mode="dialog" userName={author.user_name} authorName={author.name} />
                </div>
              </div>
              <div className={showDesktopMenuIcon ? "" : "sm:hidden"}>
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  links={author.nav_menu_enabled ? catLinks : []}
                  userName={author.user_name}
                  authorName={author.name}
                />
              </div>
            </section>
          ) : null}
          <Link href={getPublicProfileUrl(username, { customDomain: true })} className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <header className="mt-6 sm:mt-8">
            <h1 className="w-full break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              {blog.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={getPublicProfileUrl(username, { customDomain: true })}
                className="inline-flex items-center gap-3 rounded-md -mx-1 px-1 py-0.5 text-muted-foreground hover:text-foreground"
              >
                {author.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(author.profile_image_url)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border/70" />
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
                  {new Date(blog.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
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
          <PublicSiteFooter user={author} pages={pages} useCustomDomain />
        </div>
      </article>
    );
  }

  // ── Custom page: /page/[slug] ─────────────────────────────────────────────
  if (segments[0] === "page" && segments[1]) {
    const pageSlug = segments[1];
    const [user, pages, categories, page] = await Promise.all([
      loadUser(username),
      loadPages(username),
      loadCategories(username),
      loadPage(username, pageSlug),
    ]);

    if (!user || !page) notFound();

    const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
    const mainSpacing = user.navbar_enabled
      ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
      : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showDesktopInline = categories.length > 0 && categories.length <= 5;
    const showDesktopMenuIcon = categories.length > 5;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
        <main className={mainSpacing}>
          {user.navbar_enabled ? (
            <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
              <div className={`hidden items-center justify-between gap-4 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
                <Link href={getPublicProfileUrl(username, { customDomain: true })} className="truncate text-lg font-semibold hover:underline">
                  {navBlogName}
                </Link>
                <div className="flex min-w-0 items-center gap-4">
                  {user.nav_menu_enabled && showDesktopInline ? (
                    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                      {categories.map((c) => (
                        <Link key={c.category_id} href={getPublicCategoryUrl(username, c.slug, { customDomain: true })} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
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
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  links={user.nav_menu_enabled ? catLinks : []}
                  userName={user.user_name}
                  authorName={user.name}
                />
              </div>
            </section>
          ) : null}

          <Link
            href={getPublicProfileUrl(username, { customDomain: true })}
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
          <PublicSiteFooter user={user} pages={pages} useCustomDomain />
        </main>
      </div>
    );
  }

  // ── Category page: /category/[slug] ───────────────────────────────────────
  if (segments[0] === "category" && segments[1]) {
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
    const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
    const mainSpacing = user.navbar_enabled
      ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
      : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

    const catLinks = categories.map((c) => ({
      href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
      label: c.name,
    }));
    const showDesktopInline = categories.length > 0 && categories.length <= 5;
    const showDesktopMenuIcon = categories.length > 5;

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
        <main className={mainSpacing}>
          {user.navbar_enabled ? (
            <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
              <div className={`hidden items-center justify-between gap-4 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
                <Link href={getPublicProfileUrl(username, { customDomain: true })} className="truncate text-lg font-semibold hover:underline">
                  {navBlogName}
                </Link>
                <div className="flex min-w-0 items-center gap-4">
                  {user.nav_menu_enabled && showDesktopInline ? (
                    <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                      {categories.map((c) => (
                        <Link
                          key={c.category_id}
                          href={getPublicCategoryUrl(username, c.slug, { customDomain: true })}
                          className={`whitespace-nowrap text-sm ${c.slug === categorySlug ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
              <div className={showDesktopMenuIcon ? "" : "sm:hidden"}>
                <PublicMobileNavMenu
                  title={navBlogName}
                  titleHref={getPublicProfileUrl(username, { customDomain: true })}
                  links={user.nav_menu_enabled ? catLinks : []}
                  userName={user.user_name}
                  authorName={user.name}
                />
              </div>
            </section>
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
            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
            </div>
          )}
          <PublicSiteFooter user={user} pages={pages} useCustomDomain />
        </main>
      </div>
    );
  }

  // ── Profile / home ────────────────────────────────────────────────────────
  const [user, blogs, pages, categories] = await Promise.all([
    loadUser(username),
    loadBlogs(username),
    loadPages(username),
    loadCategories(username),
  ]);

  if (!user) notFound();

  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;
  const mainSpacing = user.navbar_enabled
    ? "mx-auto max-w-3xl px-[26px] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-14 sm:pt-6"
    : "mx-auto max-w-3xl px-[26px] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14";

  // On custom domain, nav links are relative
  const catLinks = categories.map((c) => ({
    href: getPublicCategoryUrl(username, c.slug, { customDomain: true }),
    label: c.name,
  }));
  const showDesktopInline = categories.length > 0 && categories.length <= 5;
  const showDesktopMenuIcon = categories.length > 5;

  // Rewrite blog hrefs to be relative for custom domain
  const blogsWithRelativeHrefs = blogs;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className={mainSpacing}>
        {user.navbar_enabled ? (
          <section className="mb-8 rounded-lg border border-border/80 bg-muted/30 p-4">
            <div className={`hidden items-center justify-between gap-4 ${showDesktopMenuIcon ? "" : "sm:flex"}`}>
              <p className="truncate text-lg font-semibold">{navBlogName}</p>
              <div className="flex min-w-0 items-center gap-4">
                {user.nav_menu_enabled && showDesktopInline ? (
                  <nav className="flex min-w-0 items-center gap-3 overflow-x-auto">
                    {categories.map((c) => (
                      <Link key={c.category_id} href={getPublicCategoryUrl(username, c.slug, { customDomain: true })} className="whitespace-nowrap text-sm text-muted-foreground hover:text-foreground">
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
            <div className={showDesktopMenuIcon ? "" : "sm:hidden"}>
              <PublicMobileNavMenu
                title={navBlogName}
                links={user.nav_menu_enabled ? catLinks : []}
                userName={user.user_name}
                authorName={user.name}
              />
            </div>
          </section>
        ) : null}
        <PublicBlogListSearch
          blogs={blogsWithRelativeHrefs}
          username={username}
          user={user}
          useCustomDomain
          siteOrigin={siteOrigin}
        />
        <PublicSiteFooter user={user} pages={pages} useCustomDomain />
      </main>
    </div>
  );
}
