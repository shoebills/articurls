import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  if (isReservedUsername(username)) return {};
  const blog = await loadBlog(username, slug);
  if (!blog) return { title: "Not found" };
  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || undefined,
  };
}

export default async function PublicBlogPage({ params }: Props) {
  const { username, slug } = await params;
  if (isReservedUsername(username)) notFound();

  const [blog, author] = await Promise.all([loadBlog(username, slug), loadUser(username)]);
  if (!blog || !author) notFound();

  return (
    <article className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14">
        <Link
          href={`/${username}`}
          className="inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← {author.name}
        </Link>
        <header className="mt-6 sm:mt-8">
          <h1 className="text-balance break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {blog.title}
          </h1>
          {blog.published_at && (
            <time className="mt-4 block text-sm text-muted-foreground" dateTime={blog.published_at}>
              {new Date(blog.published_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
        </header>
        <div
          className="prose-blog mt-12"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
        {blog.media?.length > 0 && (
          <div className="mt-12 space-y-6">
            {blog.media.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.media_id} src={assetUrl(m.url)} alt="" className="w-full rounded-lg" />
            ))}
          </div>
        )}
        <div className="mt-14">
          <SubscribeToAuthor userName={author.user_name} authorName={author.name} />
        </div>
        <footer className="mt-12 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <a href={MARKETING_ORIGIN} className="underline">
            Published with Articurls
          </a>
        </footer>
      </div>
    </article>
  );
}
