"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicUser } from "@/lib/types";
import { MARKETING_ORIGIN } from "@/lib/env";
import { scoreByTitleAndContent } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/components/search-context";
import { resolveBlogCoverImage } from "@/lib/blog-images";
import { getPublicPostUrl } from "@/lib/public-url";
import { BlogPostShareMenu } from "@/components/blog-post-share-menu";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  username: string;
  user?: PublicUser;
  hideFeatured?: boolean;
  useCustomDomain?: boolean;
  siteOrigin?: string;
};

const POSTS_PER_PAGE = 10;

function publicBlogPostUrl(userName: string, slug: string, useCustomDomain = false, siteOrigin?: string) {
  const path = getPublicPostUrl(userName, slug, { customDomain: useCustomDomain });
  return `${siteOrigin || MARKETING_ORIGIN}${path}`;
}

function BlogListItemRow({
  blog: b,
  username,
  useCustomDomain = false,
  siteOrigin,
}: {
  blog: PublicBlog;
  username: string;
  useCustomDomain?: boolean;
  siteOrigin?: string;
}) {
  const previewImage = resolveBlogCoverImage(b);
  return (
    <li className="py-5 first:pt-0">
      <div className="rounded-xl py-1">
        <Link href={getPublicPostUrl(username, b.slug, { customDomain: useCustomDomain })} className="group block transition-colors hover:bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="min-w-0 truncate text-lg font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4 sm:text-xl">
                {b.title}
              </h3>
              {b.excerpt && <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>}
            </div>
            {previewImage && !b.hide_preview_in_lists ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt=""
                width={96}
                height={64}
                className="aspect-[3/2] w-24 shrink-0 rounded-md border border-border/70 object-cover sm:w-36"
              />
            ) : null}
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          {b.published_at ? (
            <time className="text-xs text-muted-foreground" dateTime={b.published_at}>
              {new Date(b.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          ) : (
            <span className="text-xs text-muted-foreground" aria-hidden />
          )}
          <BlogPostShareMenu
            url={publicBlogPostUrl(username, b.slug, useCustomDomain, siteOrigin)}
            title={b.title}
          />
        </div>
      </div>
    </li>
  );
}

export function PublicBlogListSearch({ blogs, username, user, hideFeatured, useCustomDomain = false, siteOrigin }: PublicBlogListSearchProps) {
  const { query } = useSearch();
  const [page, setPage] = useState(1);

  const featuredBlogs = useMemo(() => {
    if (hideFeatured) return [];
    if (!user?.featured_blogs_enabled) return [];
    if (!user.featured_blog_ids || user.featured_blog_ids.length === 0) return [];
    
    return user.featured_blog_ids
      .map(id => blogs.find(b => b.blog_id === id))
      .filter((b): b is PublicBlog => Boolean(b));
  }, [user, blogs, hideFeatured]);
  
  const showFeatured = featuredBlogs.length > 0 && query.trim() === "";

  const sortedBlogs = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const rows = [...blogs];
      rows.sort((a, b) => {
        const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bDate - aDate;
      });
      return rows;
    }

    return blogs
      .map((blog) => ({
        blog,
        score: scoreByTitleAndContent(blog.title || "", `${blog.content || ""} ${blog.excerpt || ""}`, trimmed),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aDate = a.blog.published_at ? new Date(a.blog.published_at).getTime() : 0;
        const bDate = b.blog.published_at ? new Date(b.blog.published_at).getTime() : 0;
        return bDate - aDate;
      })
      .map((row) => row.blog);
  }, [blogs, query]);

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return sortedBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [sortedBlogs, currentPage]);

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 sm:mt-6">
      {showFeatured ? (
        <div className="mb-10 sm:mb-14">
          <h2 className="mb-5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">Featured Posts</h2>
          <ul>
            {featuredBlogs.map(b => (
               <BlogListItemRow
                 key={`featured-${b.blog_id}`}
                 blog={b}
                 username={username}
                 useCustomDomain={useCustomDomain}
                 siteOrigin={siteOrigin}
               />
            ))}
          </ul>
        </div>
      ) : null}

      {showFeatured && (
        <h2 className="mb-5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">Recent Posts</h2>
      )}

      <ul>
        {pagedBlogs.map((b) => (
          <BlogListItemRow
            key={b.blog_id}
            blog={b}
            username={username}
            useCustomDomain={useCustomDomain}
            siteOrigin={siteOrigin}
          />
        ))}
      </ul>

      {sortedBlogs.length > 0 ? (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-white px-3 py-2 sm:px-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border/80 bg-white shadow-sm hover:bg-white hover:text-foreground h-8 min-h-0 px-3 py-1.5"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border/80 bg-white shadow-sm hover:bg-white hover:text-foreground h-8 min-h-0 px-3 py-1.5"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {sortedBlogs.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-white px-4 py-3 text-sm text-muted-foreground">
          No posts match your search.
        </p>
      )}
    </section>
  );
}
