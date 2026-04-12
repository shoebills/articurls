import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser } from "@/lib/types";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (isReservedUsername(username)) return {};
  const user = await loadUser(username);
  if (!user) return { title: "Not found" };
  return {
    title: user.seo_title || `${user.name} — Articurls`,
    description: user.seo_description || undefined,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  if (isReservedUsername(username)) notFound();

  const user = await loadUser(username);
  if (!user) notFound();

  const blogs = await loadBlogs(username);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <header className="relative border-b border-border/80 bg-gradient-to-b from-muted/20 to-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,oklch(0.55_0.12_264/0.08),transparent_65%)]" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6 sm:py-16">
          {user.profile_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assetUrl(user.profile_image_url)}
              alt=""
              className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-background ring-offset-2 ring-offset-transparent"
            />
          )}
          <div>
            <h1 className="flex flex-wrap items-center justify-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {user.name}
              {user.verification_tick && (
                <span className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  Verified
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">@{user.user_name}</p>
          </div>
          {user.seo_description && (
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{user.seo_description}</p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Stories</h2>
        <ul className="mt-6 divide-y divide-border/80">
          {blogs.map((b) => (
            <li key={b.blog_id} className="py-8 first:pt-0">
              <Link href={`/${username}/blog/${b.slug}`} className="group block rounded-xl py-1 transition-colors hover:bg-muted/30">
                <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
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
        <p className="mt-12 text-center text-xs text-muted-foreground">
          <a href={MARKETING_ORIGIN} className="underline">
            Start writing on Articurls
          </a>
        </p>
      </main>
    </div>
  );
}
