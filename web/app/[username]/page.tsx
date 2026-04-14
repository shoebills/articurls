import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { isReservedUsername } from "@/lib/reserved-usernames";
import type { PublicBlog, PublicUser, UserPage } from "@/lib/types";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiX,
} from "react-icons/si";
import { MdOutlineEmail, MdVerified } from "react-icons/md";
import { FaLinkedinIn } from "react-icons/fa6";
import { Menu } from "lucide-react";

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

function normalizePublicLink(link: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link}`;
}

function socialItems(user: PublicUser) {
  return [
    { key: "contact_email", href: user.contact_email ? `mailto:${user.contact_email}` : null, label: "Email", icon: <MdOutlineEmail className="h-4 w-4" aria-hidden /> },
    { key: "instagram", href: user.instagram_link, label: "Instagram", icon: <SiInstagram className="h-4 w-4" aria-hidden /> },
    { key: "x", href: user.x_link, label: "X", icon: <SiX className="h-4 w-4" aria-hidden /> },
    { key: "pinterest", href: user.pinterest_link, label: "Pinterest", icon: <SiPinterest className="h-4 w-4" aria-hidden /> },
    { key: "facebook", href: user.facebook_link, label: "Facebook", icon: <SiFacebook className="h-4 w-4" aria-hidden /> },
    { key: "linkedin", href: user.linkedin_link, label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" aria-hidden /> },
    { key: "github", href: user.github_link, label: "GitHub", icon: <SiGithub className="h-4 w-4" aria-hidden /> },
  ].filter((item) => item.href && item.href.trim() !== "");
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
  const pages = await loadPages(username);
  const navBlogName = (user.nav_blog_name || "").trim() || `${user.name}'s Blog`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/15">
      <main className="mx-auto max-w-3xl px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-14 sm:pb-14 sm:pt-14">
        {user.navbar_enabled ? (
          <section className="mb-8 border-b border-border/80 pb-4">
            <div className="hidden items-center justify-between gap-4 sm:flex">
              <p className="truncate text-sm font-semibold">{navBlogName}</p>
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
                  ) : (
                    <p className="text-sm text-muted-foreground">Add pages to display.</p>
                  )
                ) : null}
                <div className="shrink-0">
                  <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                </div>
              </div>
            </div>
            <div className="sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{navBlogName}</p>
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
                        ) : (
                          <p className="px-2 py-1 text-sm text-muted-foreground">Add pages to display.</p>
                        )
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
        <section className="border-b border-border/80 pb-10 sm:pb-12">
          <div className="flex w-full items-start gap-4 sm:gap-5">
            {user.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assetUrl(user.profile_image_url)}
                alt=""
                className="h-20 w-20 shrink-0 rounded-full object-cover shadow-md ring-2 ring-border/60 sm:h-24 sm:w-24"
              />
            ) : null}
            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <h1 className="min-w-0 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                  <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words">{user.name}</span>
                    {user.verification_tick && <VerifiedBadge />}
                  </span>
                </h1>
                {!user.navbar_enabled ? (
                  <div className="flex w-full shrink-0 basis-full justify-stretch sm:w-auto sm:basis-auto sm:justify-end">
                    <SubscribeToAuthor mode="dialog" userName={user.user_name} authorName={user.name} />
                  </div>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">@{user.user_name}</p>
            </div>
          </div>
        </section>
        <Tabs defaultValue="blogs" className="mt-10 sm:mt-12">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-9 sm:w-auto">
            <TabsTrigger value="blogs" className="min-h-11 sm:min-h-8">
              Blogs
            </TabsTrigger>
            <TabsTrigger value="about" className="min-h-11 sm:min-h-8">
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blogs" className="mt-6">
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
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {user.bio ? (
                <p>{user.bio}</p>
              ) : (
                <p>No bio added yet.</p>
              )}
              {user.link ? (
                <p>
                  <a
                    href={normalizePublicLink(user.link)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    {user.link}
                  </a>
                </p>
              ) : null}
              {socialItems(user).length > 0 ? (
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {socialItems(user).map((item) => {
                    const href = item.href as string;
                    const isMail = href.startsWith("mailto:");
                    return (
                      <a
                        key={item.key}
                        href={isMail ? href : normalizePublicLink(href)}
                        target={isMail ? undefined : "_blank"}
                        rel={isMail ? undefined : "noreferrer"}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/25 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={item.label}
                        title={item.label}
                      >
                        {item.icon}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
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
