"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicBlog, PublicSite, ContentLayout } from "@/lib/types";
import { PublicPostCard } from "@/components/public-post-card";
import { PublicEmptyState } from "@/components/public-empty-state";
import { PublicPagination, PublicLoadMore } from "@/components/public-pagination";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  subdomain: string;
  site?: PublicSite;
  hideFeatured?: boolean;
  siteOrigin?: string;
  content_layout?: ContentLayout;
  show_preview_in_lists?: boolean;
  basePath?: string;
  recentHeading?: string;
};

const POSTS_PER_PAGE = 12;

export function PublicBlogListSearch({
  blogs,
  subdomain,
  site,
  hideFeatured,
  content_layout = "grid",
  show_preview_in_lists = true,
  basePath = "",
  recentHeading = "Recent Posts",
}: PublicBlogListSearchProps) {
  const [page, setPage] = useState(1);

  const featuredBlogIds = site?.featured_blog_ids;
  const featuredBlogs = useMemo(() => {
    if (hideFeatured) return [];
    if (!featuredBlogIds || featuredBlogIds.length === 0) return [];
    
    return featuredBlogIds
      .map(id => blogs.find(b => b.blog_id === id))
      .filter((b): b is PublicBlog => Boolean(b));
  }, [featuredBlogIds, blogs, hideFeatured]);
  
  const showFeatured = featuredBlogs.length > 0;

  const sortedBlogs = useMemo(() => {
    const rows = [...blogs];
    rows.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    });
    return rows;
  }, [blogs]);

  const postsPerPage = site?.posts_per_page && site.posts_per_page >= 6 ? site.posts_per_page : POSTS_PER_PAGE;
  const paginationType = site?.pagination_type || "prev_next";
  const isLoadMore = paginationType === "load_more";

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / postsPerPage));
  const currentPage = Math.min(page, totalPages);
  const [visibleCount, setVisibleCount] = useState(postsPerPage);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisibleCount(postsPerPage));
    return () => cancelAnimationFrame(raf);
  }, [blogs, postsPerPage]);
  const pagedBlogs = useMemo(() => {
    if (isLoadMore) return sortedBlogs.slice(0, visibleCount);
    const start = (currentPage - 1) * postsPerPage;
    return sortedBlogs.slice(start, start + postsPerPage);
  }, [sortedBlogs, currentPage, postsPerPage, isLoadMore, visibleCount]);

  const isGrid = content_layout === "grid";
  const listClass = isGrid
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
    : "space-y-0";

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <PublicEmptyState message="No published posts yet." />
      </section>
    );
  }

  return (
    <section className="mt-5 sm:mt-6">
      {showFeatured ? (
        <div className="mb-10 sm:mb-14">
          <h2 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Featured Posts</h2>
          <div className={listClass}>
            {featuredBlogs.map((b) => (
              <PublicPostCard
                key={`featured-${b.blog_id}`}
                blog={b}
                subdomain={subdomain}
                authorName={b.author?.name || site?.name}
                showPreview={show_preview_in_lists}
                basePath={basePath}
                variant={isGrid ? "card" : "row"}
              />
            ))}
          </div>
        </div>
      ) : null}

      <h2 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">{recentHeading}</h2>

      <div className={listClass}>
        {pagedBlogs.map((b) => (
          <PublicPostCard
            key={b.blog_id}
            blog={b}
            subdomain={subdomain}
            authorName={b.author?.name || site?.name}
            showPreview={show_preview_in_lists}
            basePath={basePath}
            variant={isGrid ? "card" : "row"}
          />
        ))}
      </div>

      {sortedBlogs.length > 0 ? (
        isLoadMore ? (
          <PublicLoadMore
            visibleCount={Math.min(visibleCount, sortedBlogs.length)}
            totalCount={sortedBlogs.length}
            onLoadMore={() => setVisibleCount((c) => c + postsPerPage)}
            buttonVariant={site?.button_variant || "solid"}
          />
        ) : (
          <PublicPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )
      ) : null}
    </section>
  );
}
