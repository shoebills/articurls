import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { MARKETING_ORIGIN, API_URL, assetUrl } from "@/lib/env";
import Link from "next/link";
import type { PublicBlog, PublicBlogAds, PublicUser, UserPage } from "@/lib/types";
import { injectAdsIntoHtml } from "@/lib/ad-injection";
import { AdSlot } from "@/components/ad-slot";

type Props = { params: Promise<{ slug?: string[] }> };

const SERVER_API_URL = (process.env.INTERNAL_API_URL || API_URL).replace(/\/$/, "");
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

function apiHeaders(): HeadersInit {
  if (!INTERNAL_SECRET) return {};
  return { "x-internal-secret": INTERNAL_SECRET };
}

async function blogByHost(host: string, slug: string): Promise<PublicBlog> {
  const res = await fetch(
    `${SERVER_API_URL}/public/custom-domain/posts/${encodeURIComponent(slug)}?host=${encodeURIComponent(host)}`,
    { cache: "no-store", redirect: "manual", headers: apiHeaders() }
  );

  if (res.status === 301 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) permanentRedirect(location);
  }
  if (res.status === 302 || res.status === 307) {
    const location = res.headers.get("location");
    if (location) redirect(location);
  }
  if (!res.ok) notFound();
  return res.json();
}

async function userByCustomHost(host: string): Promise<PublicUser> {
  const res = await fetch(
    `${SERVER_API_URL}/public/custom-domain/user?host=${encodeURIComponent(host)}`,
    { cache: "no-store", redirect: "manual", headers: apiHeaders() }
  );
  if (res.status === 301 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) permanentRedirect(location);
  }
  if (res.status === 302 || res.status === 307) {
    const location = res.headers.get("location");
    if (location) redirect(location);
  }
  if (!res.ok) notFound();
  return res.json();
}

async function getBlogAds(userName: string, slug: string): Promise<PublicBlogAds | null> {
  const res = await fetch(
    `${SERVER_API_URL}/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}/ads`,
    { cache: "no-store", headers: apiHeaders() }
  );
  if (!res.ok) return null;
  return res.json();
}

async function blogsByHost(host: string): Promise<PublicBlog[]> {
  const res = await fetch(
    `${SERVER_API_URL}/public/custom-domain/blogs?host=${encodeURIComponent(host)}`,
    { cache: "no-store", redirect: "manual", headers: apiHeaders() }
  );
  if (res.status === 301 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) permanentRedirect(location);
  }
  if (res.status === 302 || res.status === 307) {
    const location = res.headers.get("location");
    if (location) redirect(location);
  }
  if (!res.ok) return [];
  return res.json();
}

async function pagesByHost(host: string): Promise<UserPage[]> {
  const res = await fetch(
    `${SERVER_API_URL}/public/custom-domain/pages?host=${encodeURIComponent(host)}`,
    { cache: "no-store", redirect: "manual", headers: apiHeaders() }
  );
  if (res.status === 301 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) permanentRedirect(location);
  }
  if (res.status === 302 || res.status === 307) {
    const location = res.headers.get("location");
    if (location) redirect(location);
  }
  if (!res.ok) return [];
  return res.json();
}

async function pageByHost(host: string, slug: string): Promise<UserPage> {
  const res = await fetch(
    `${SERVER_API_URL}/public/custom-domain/page/${encodeURIComponent(slug)}?host=${encodeURIComponent(host)}`,
    { cache: "no-store", redirect: "manual", headers: apiHeaders() }
  );
  if (res.status === 301 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) permanentRedirect(location);
  }
  if (res.status === 302 || res.status === 307) {
    const location = res.headers.get("location");
    if (location) redirect(location);
  }
  if (!res.ok) notFound();
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0];
  if (!host) return { title: "Not found" };
  const canonicalBase = `https://${host}`;
  if (slug.length === 0) {
    const author = await userByCustomHost(host);
    return {
      title: author.seo_title || `${author.name}'s Blog`,
      description: author.seo_description || undefined,
      alternates: { canonical: `${canonicalBase}/` },
    };
  }
  if (slug[0] === "page" && slug[1]) {
    const page = await pageByHost(host, slug[1]);
    return {
      title: page.title,
      alternates: { canonical: `${canonicalBase}/page/${encodeURIComponent(slug[1])}` },
    };
  }
  const blog = await blogByHost(host, slug[0]);
  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || undefined,
    alternates: { canonical: `${canonicalBase}/${encodeURIComponent(slug[0])}` },
  };
}

export default async function CustomDomainPostPage({ params }: Props) {
  const { slug = [] } = await params;
  const h = await headers();
  const host = (h.get("host") || "").split(":")[0];
  if (!host) notFound();

  const author = await userByCustomHost(host);
  const pages = await pagesByHost(host);

  if (slug.length === 0) {
    const blogs = await blogsByHost(host);
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <section className="border-b border-border/80 pb-8">
            <h1 className="text-3xl font-bold">{author.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">@{author.user_name}</p>
            {author.bio ? <p className="mt-4 text-muted-foreground">{author.bio}</p> : null}
          </section>
          {pages.length > 0 ? (
            <nav className="mt-6 flex flex-wrap items-center gap-3">
              {pages.map((p) => (
                <Link key={p.page_id} href={`/page/${p.slug}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                  {p.title}
                </Link>
              ))}
            </nav>
          ) : null}
          <section className="mt-10 space-y-6">
            {blogs.map((b) => (
              <article key={b.blog_id}>
                <Link href={`/${b.slug}`} className="text-xl font-semibold hover:underline">
                  {b.title}
                </Link>
                {b.excerpt ? <p className="mt-2 text-muted-foreground">{b.excerpt}</p> : null}
              </article>
            ))}
          </section>
        </main>
      </div>
    );
  }

  if (slug[0] === "page" && slug[1]) {
    const page = await pageByHost(host, slug[1]);
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← {author.name}
            </Link>
          </div>
          <article>
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
            <div className="prose-blog mt-6" dangerouslySetInnerHTML={{ __html: page.content }} />
          </article>
        </main>
      </div>
    );
  }

  const targetSlug = slug[0];
  const [blog, adConfig] = await Promise.all([
    blogByHost(host, targetSlug),
    getBlogAds(author.user_name, targetSlug),
  ]);

  const adSegments =
    adConfig?.enabled && adConfig.ad_code
      ? injectAdsIntoHtml(blog.content, adConfig.ad_frequency, 4)
      : [{ type: "html" as const, html: blog.content }];

  return (
    <article className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
        <header className="mt-4 sm:mt-6">
          <h1 className="text-balance break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {blog.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <a
              href={`${MARKETING_ORIGIN}/${author.user_name}`}
              className="inline-flex items-center gap-3 rounded-md -mx-1 px-1 py-0.5 text-muted-foreground hover:text-foreground"
            >
              {author.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(author.profile_image_url)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border/70" />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full bg-muted ring-1 ring-border/70" aria-hidden />
              )}
              <span className="truncate text-sm">@{author.user_name}</span>
            </a>
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
      </div>
    </article>
  );
}
