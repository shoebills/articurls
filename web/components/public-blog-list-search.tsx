"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicSite, ContentWidth, ListImagePosition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { resolveBlogCoverImage } from "@/lib/blog-images";
import { getPublicPostUrl } from "@/lib/public-url";
import { Calendar, Image } from "lucide-react";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  subdomain: string;
  site?: PublicSite;
  hideFeatured?: boolean;
  siteOrigin?: string;
  content_width?: ContentWidth;
  list_image_position?: ListImagePosition;
  show_preview_in_lists?: boolean;
  basePath?: string;
};

const POSTS_PER_PAGE = 12;

function BlogListItemRow({
  blog: b,
  subdomain,
  authorName,
  inGrid = false,
  largeImage = false,
  showPreview = true,
  basePath = "",
}: {
  blog: PublicBlog;
  subdomain: string;
  authorName?: string;
  inGrid?: boolean;
  largeImage?: boolean;
  showPreview?: boolean;
  basePath?: string;
}) {
  const previewImage = resolveBlogCoverImage(b);
  return (
    <li className={inGrid ? "" : "py-5 first:pt-0"}>
      <div className="rounded-xl py-1">
        <Link href={getPublicPostUrl(subdomain, b.slug, basePath)} className="group block transition-colors hover:bg-muted/30">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="min-w-0 truncate text-xl font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
                {b.title}
              </h3>
{b.excerpt && <p className={`mt-2 text-muted-foreground ${largeImage ? "max-sm:line-clamp-2" : "line-clamp-2"}`}>{b.excerpt}</p>}
            </div>
            {previewImage && showPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt=""
                width={largeImage ? 224 : 96}
                height={largeImage ? 149 : 64}
                className={`aspect-[3/2] shrink-0 rounded-md border border-border/70 object-cover w-24 sm:${largeImage ? "w-56" : "w-36"}`}
              />
            ) : null}
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{authorName}</span>
          {b.published_at ? (
            <time className="inline-flex items-center gap-1 text-sm text-muted-foreground" dateTime={b.published_at}>
              <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
              {new Date(b.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          ) : (
            <span className="text-sm text-muted-foreground" aria-hidden />
          )}
        </div>
      </div>
    </li>
  );
}

function BlogListAboveTitleItem({
  blog: b,
  subdomain,
  authorName,
  showPreview = true,
  basePath = "",
}: {
  blog: PublicBlog;
  subdomain: string;
  authorName?: string;
  showPreview?: boolean;
  basePath?: string;
}) {
  const previewImage = resolveBlogCoverImage(b);
  const showImage = previewImage && showPreview;
  return (
    <li className="py-5 first:pt-0">
      <Link
        href={getPublicPostUrl(subdomain, b.slug, basePath)}
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
        <h3 className="text-xl font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
          {b.title}
        </h3>
        {b.excerpt && <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>}
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{authorName}</span>
        {b.published_at ? (
          <time className="inline-flex items-center gap-1 text-sm text-muted-foreground" dateTime={b.published_at}>
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            {new Date(b.published_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        ) : (
          <span className="text-sm text-muted-foreground" aria-hidden />
        )}
      </div>
    </li>
  );
}

function BlogCardGridItem({
  blog: b,
  subdomain,
  authorName,
  showPreview = true,
  basePath = "",
}: {
  blog: PublicBlog;
  subdomain: string;
  authorName?: string;
  showPreview?: boolean;
  basePath?: string;
}) {
  const previewImage = resolveBlogCoverImage(b);
  const showImage = previewImage && showPreview;
  return (
    <li className="break-inside-avoid">
      <Link
        href={getPublicPostUrl(subdomain, b.slug, basePath)}
        className="group block"
      >
        {showImage || showPreview ? (
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
              <div className="flex aspect-[3/2] w-full items-center justify-center bg-muted/30">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ) : null}
        <div className="pt-4 pb-3">
          <h3 className="line-clamp-2 text-xl font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4">
            {b.title}
          </h3>
          {b.excerpt && (
            <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 pb-1">
        <span className="truncate text-sm text-muted-foreground">{authorName}</span>
        {b.published_at ? (
          <time className="inline-flex items-center gap-1 text-sm text-muted-foreground" dateTime={b.published_at}>
            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
            {new Date(b.published_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        ) : (
          <span className="text-sm text-muted-foreground" aria-hidden />
        )}
      </div>
    </li>
  );
}

export function PublicBlogListSearch({
  blogs,
  subdomain,
  site,
  hideFeatured,
  content_width = "wide",
  list_image_position = "above_title",
  show_preview_in_lists = true,
  basePath = "",
}: PublicBlogListSearchProps) {
  const [page, setPage] = useState(1);

  const featuredBlogs = useMemo(() => {
    if (hideFeatured) return [];
    if (!site?.featured_blogs_enabled) return [];
    if (!site.featured_blog_ids || site.featured_blog_ids.length === 0) return [];
    
    return site.featured_blog_ids
      .map(id => blogs.find(b => b.blog_id === id))
      .filter((b): b is PublicBlog => Boolean(b));
  }, [site, blogs, hideFeatured]);
  
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
    ItemComponent = function BlogListItemRowLarge(props) { return <BlogListItemRow {...props} largeImage />; };
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
        <p className="rounded-xl border border-dashed border-border/80 bg-background px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 sm:mt-6">
      {showFeatured ? (
        <div className="mb-10 sm:mb-14">
          <h2 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Featured Posts</h2>
          <ul className={listClass}>
            {featuredBlogs.map(b => (
                <ItemComponent
                  key={`featured-${b.blog_id}`}
                  blog={b}
                  subdomain={subdomain}
                  authorName={b.author?.name || site?.name}
                  showPreview={show_preview_in_lists}
                  basePath={basePath}
                />
            ))}
          </ul>
        </div>
      ) : null}

      <h2 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Recent Posts</h2>

      <ul className={listClass}>
        {pagedBlogs.map((b) => (
          <ItemComponent
            key={b.blog_id}
            blog={b}
            subdomain={subdomain}
            authorName={b.author?.name || site?.name}
            showPreview={show_preview_in_lists}
            basePath={basePath}
          />
        ))}
      </ul>

      {sortedBlogs.length > 0 ? (
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
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
            className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
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
