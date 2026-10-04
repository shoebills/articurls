"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicSite, UserPage, Category } from "@/lib/types";
import { PublicPagination, PublicLoadMore } from "@/components/public-pagination";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public-nav-header";
import { PublicPostCard } from "@/components/public-post-card";
import { PublicEmptyState } from "@/components/public-empty-state";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";

type StandardTemplateProps = {
  site: PublicSite;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  basePath: string;
};

export function StandardTemplate({ site, blogs, pages, categories, basePath }: StandardTemplateProps) {
  const displayName = (site.site_name || "").trim() || site.subdomain || "My Blog";
  const titleHref = site.logo_link || getPublicProfileUrl(site.subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const hasHero = Boolean((site.hero_title || "").trim() || (site.hero_description || "").trim());

  const [page, setPage] = useState(1);
  const postsPerPage = site.posts_per_page && site.posts_per_page >= 6 ? site.posts_per_page : 12;
  const paginationType = site.pagination_type || "prev_next";
  const isLoadMore = paginationType === "load_more";
  const isGrid = (site.content_layout || "grid") === "grid";
  const showPreview = site.show_preview_in_lists !== false;

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavHeader
        site={site}
        categories={categories}
        basePath={basePath}
        title={displayName}
        titleHref={titleHref}
        hasBlogs={blogs.length > 0}
      />
      <main className={mainSpacing}>
        {/* Hero */}
        {hasHero ? (
          <>
            <div className="mb-20 mt-20 max-w-2xl text-left">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground text-left">
                {site.hero_title ? (
                  <span className="text-primary block mb-2 text-left">{site.hero_title}</span>
                ) : null}
                {site.hero_description ? (
                  <span className="text-xl sm:text-2xl font-normal text-muted-foreground block mt-3 leading-relaxed text-left">
                    {site.hero_description}
                  </span>
                ) : null}
              </h1>
            </div>
            {site.newsletter_show_near_header ? (
              <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 mt-8 mb-10">
                <div className="max-w-md mx-auto">
                  <SubscribeToAuthor
                    subdomain={site.subdomain}
                    headline={site.newsletter_headline}
                    text={site.newsletter_text}
                    disclaimer={site.newsletter_disclaimer}
                    buttonText={site.newsletter_button_text}
                    buttonVariant={site.button_variant || "solid"}
                    className="space-y-4 text-center"
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : site.newsletter_show_near_header ? (
          <div className="bg-muted/50 w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 sm:px-6 py-12 my-10">
            <div className="max-w-md mx-auto">
              <SubscribeToAuthor
                subdomain={site.subdomain}
                headline={site.newsletter_headline}
                text={site.newsletter_text}
                disclaimer={site.newsletter_disclaimer}
                buttonText={site.newsletter_button_text}
                buttonVariant={site.button_variant || "solid"}
                className="space-y-4 text-center"
              />
            </div>
          </div>
        ) : null}

        {/* Interactive Category Pills */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40">
            <Link
              href={getPublicProfileUrl(site.subdomain, basePath)}
              data-button-variant={site.button_variant || "solid"}
              data-button-radius="true"
              className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium shrink-0"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category_id}
                href={getPublicCategoryUrl(site.subdomain, c.slug, basePath)}
                className="px-4 py-1.5 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Feed List */}
        {sortedBlogs.length === 0 ? (
          <PublicEmptyState message="No published posts yet." />
        ) : isGrid ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {pagedBlogs.map((b) => {
                const firstCat = b.category_ids && b.category_ids.length > 0
                  ? categories.find((c) => c.category_id === b.category_ids![0])
                  : null;
                return (
                  <PublicPostCard
                    key={b.blog_id}
                    blog={b}
                    subdomain={site.subdomain}
                    basePath={basePath}
                    category={firstCat}
                    authorName={b.author ? b.author.name : site.name}
                    showPreview={showPreview}
                    variant="card"
                  />
                );
              })}
            </div>
            {sortedBlogs.length > 0 ? (
              isLoadMore ? (
                <PublicLoadMore
                  visibleCount={Math.min(visibleCount, sortedBlogs.length)}
                  totalCount={sortedBlogs.length}
                  onLoadMore={() => setVisibleCount((c) => c + postsPerPage)}
                  buttonVariant={site.button_variant || "solid"}
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
          </>
        ) : (
          <>
            <div className="space-y-0">
              {pagedBlogs.map((b) => {
                const firstCat = b.category_ids && b.category_ids.length > 0
                  ? categories.find((c) => c.category_id === b.category_ids![0])
                  : null;
                return (
                  <PublicPostCard
                    key={b.blog_id}
                    blog={b}
                    subdomain={site.subdomain}
                    basePath={basePath}
                    category={firstCat}
                    authorName={b.author ? b.author.name : site.name}
                    showPreview={showPreview}
                    variant="row"
                  />
                );
              })}
            </div>
            {sortedBlogs.length > 0 ? (
              isLoadMore ? (
                <PublicLoadMore
                  visibleCount={Math.min(visibleCount, sortedBlogs.length)}
                  totalCount={sortedBlogs.length}
                  onLoadMore={() => setVisibleCount((c) => c + postsPerPage)}
                  buttonVariant={site.button_variant || "solid"}
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
          </>
        )}

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}
