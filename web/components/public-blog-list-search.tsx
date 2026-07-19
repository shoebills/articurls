"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicUser, ContentWidth, ListImagePosition } from "@/lib/types";
import { UGS_ORIGIN } from "@/lib/env";
import { Button } from "@/components/ui/button";
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
  content_width?: ContentWidth;
  list_image_position?: ListImagePosition;
};

const POSTS_PER_PAGE = 12;

function publicBlogPostUrl(userName: string, slug: string, useCustomDomain = false, siteOrigin?: string) {
  const path = getPublicPostUrl(userName, slug, { customDomain: useCustomDomain });
  return `${siteOrigin || UGS_ORIGIN}${path}`;
}

function BlogListItemRow({
  blog: b,
  username,
  useCustomDomain = false,
  siteOrigin,
  inGrid = false,
  largeImage = false,
}: {
  blog: PublicBlog;
  username: string;
  useCustomDomain?: boolean;
  siteOrigin?: string;
  inGrid?: boolean;
  largeImage?: boolean;
}) {
  const previewImage = resolveBlogCoverImage(b);
  return (
    <li className={inGrid ? "" : "py-5 first:pt-0"}>
      <div className="rounded-xl py-1">
        <Link href={getPublicPostUrl(username, b.slug, { customDomain: useCustomDomain })} className="group block transition-colors hover:bg-muted/30">
          <div className="flex items-start gap-4">
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
                width={largeImage ? 224 : 96}
                height={largeImage ? 149 : 64}
                className={`aspect-[3/2] shrink-0 rounded-md border border-border/70 object-cover ${largeImage ? "w-36 sm:w-56" : "w-24 sm:w-36"}`}
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

function BlogListAboveTitleItem({
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
  const showImage = previewImage && !b.hide_preview_in_lists;
  return (
    <li className="py-5 first:pt-0">
      <Link
        href={getPublicPostUrl(username, b.slug, { customDomain: useCustomDomain })}
        className="group block"
      >
        {showImage ? (
          <div className="overflow-hidden rounded-xl border border-border/70 shadow-sm mb-4 transition-shadow group-hover:shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt=""
              width={600}
              height={400}
              className="aspect-[3/2] w-full object-cover"
            />
          </div>
        ) : null}
        <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4 sm:text-xl">
          {b.title}
        </h3>
        {b.excerpt && <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>}
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
    </li>
  );
}

function BlogCardGridItem({
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
  const showImage = previewImage && !b.hide_preview_in_lists;
  return (
    <li className="break-inside-avoid">
      <Link
        href={getPublicPostUrl(username, b.slug, { customDomain: useCustomDomain })}
        className="group block"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 shadow-sm transition-shadow group-hover:shadow-md">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage}
              alt=""
              width={600}
              height={400}
              className="aspect-[3/2] w-full object-cover"
            />
          ) : (
            <div
              className="aspect-[3/2] w-full"
              style={{
                background: `
                  radial-gradient(ellipse 170% 85% at 18% -12%, rgba(255,255,255,.58) 0%, rgba(235,235,235,.26) 28%, rgba(185,185,185,.09) 52%, transparent 72%),
                  radial-gradient(circle at 12% 88%, rgba(255,255,255,.14) 0%, rgba(255,255,255,.05) 35%, transparent 70%),
                  linear-gradient(135deg, #181818 0%, #242424 25%, #555 60%, #bdbdbd 100%),
                  url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='6' seed='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")
                `,
                backgroundBlendMode: "overlay, normal, normal, normal",
                backgroundSize: "auto, auto, auto, 96px 96px",
                filter: "blur(1px)",
              }}
            />
          )}
        </div>
        <div className="pt-4 pb-3">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
            {b.title}
          </h3>
          {b.excerpt && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.excerpt}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 pb-1">
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
    </li>
  );
}

export function PublicBlogListSearch({
  blogs,
  username,
  user,
  hideFeatured,
  useCustomDomain = false,
  siteOrigin,
  content_width = "wide",
  list_image_position = "above_title",
}: PublicBlogListSearchProps) {
  const [page, setPage] = useState(1);

  const featuredBlogs = useMemo(() => {
    if (hideFeatured) return [];
    if (!user?.featured_blogs_enabled) return [];
    if (!user.featured_blog_ids || user.featured_blog_ids.length === 0) return [];
    
    return user.featured_blog_ids
      .map(id => blogs.find(b => b.blog_id === id))
      .filter((b): b is PublicBlog => Boolean(b));
  }, [user, blogs, hideFeatured]);
  
  const showFeatured = featuredBlogs.length > 0;

  const sortedBlogs = useMemo(() => {
    const rows = [...blogs];
    rows.sort((a, b) => {
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    });
    return rows;
  }, [blogs]);

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return sortedBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [sortedBlogs, currentPage]);

  const isWide = content_width === "wide";
  const isAboveTitle = list_image_position === "above_title";

  let ItemComponent: typeof BlogListItemRow;
  let listClass = "";

  if (isWide && isAboveTitle) {
    ItemComponent = BlogCardGridItem;
    listClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8";
  } else if (isWide && !isAboveTitle) {
    ItemComponent = (props) => <BlogListItemRow {...props} largeImage />;
    listClass = "";
  } else if (!isWide && isAboveTitle) {
    ItemComponent = BlogListAboveTitleItem;
    listClass = "";
  } else {
    ItemComponent = BlogListItemRow;
    listClass = "";
  }

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <p className="rounded-xl border border-dashed border-border/80 bg-white px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 sm:mt-6">
      {showFeatured ? (
        <div className="mb-10 sm:mb-14">
          <h2 className="mb-5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">Featured Posts</h2>
          <ul className={listClass}>
            {featuredBlogs.map(b => (
               <ItemComponent
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

      <h2 className="mb-5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">Recent Posts</h2>

      <ul className={listClass}>
        {pagedBlogs.map((b) => (
          <ItemComponent
            key={b.blog_id}
            blog={b}
            username={username}
            useCustomDomain={useCustomDomain}
            siteOrigin={siteOrigin}
          />
        ))}
      </ul>

      {sortedBlogs.length > 0 ? (
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 bg-white shadow-sm hover:bg-white hover:text-foreground h-8 min-h-0 px-3 py-1.5"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Prev
          </Button>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Page {currentPage} of {totalPages}
          </p>
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
      ) : null}
    </section>
  );
}
