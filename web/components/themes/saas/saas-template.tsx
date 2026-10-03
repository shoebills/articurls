"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PublicBlog, PublicSite, UserPage, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicNavHeader, getPublicMainSpacing } from "@/components/public-nav-header";
import { PublicPostCard } from "@/components/public-post-card";
import { PublicEmptyState } from "@/components/public-empty-state";
import { getPublicCategoryUrl, getPublicProfileUrl } from "@/lib/public-url";

type SaasTemplateProps = {
  site: PublicSite;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  basePath: string;
};

export function SaasTemplate({ site, blogs, pages, categories, basePath }: SaasTemplateProps) {
  const displayName = (site.site_name || "").trim() || site.name || site.subdomain || "My Blog";
  const titleHref = site.logo_link || getPublicProfileUrl(site.subdomain, basePath);
  const isNavEnabled = site.navbar_enabled !== false;
  const mainSpacing = getPublicMainSpacing(isNavEnabled);

  const hasHero = Boolean((site.hero_title || "").trim() || (site.hero_description || "").trim());

  const [page, setPage] = useState(1);
  const postsPerPage = site.posts_per_page && site.posts_per_page >= 6 ? site.posts_per_page : 12;
  const paginationType = site.pagination_type || "prev_next";
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
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * postsPerPage;
    return sortedBlogs.slice(start, start + postsPerPage);
  }, [sortedBlogs, currentPage, postsPerPage]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={mainSpacing}>
        <PublicNavHeader
          site={site}
          categories={categories}
          basePath={basePath}
          title={displayName}
          titleHref={titleHref}
          hasBlogs={blogs.length > 0}
        />

        {/* SaaS Hero */}
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
              paginationType === "numbered" && totalPages > 1 ? (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={num === currentPage ? "default" : "outline"}
                      size="sm"
                      data-button-radius="true"
                      data-button-variant={num === currentPage ? (site.button_variant || "solid") : undefined}
                      className="h-8 w-8 min-h-0 p-0 text-xs"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : (
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
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
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
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
              paginationType === "numbered" && totalPages > 1 ? (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <Button
                      key={num}
                      variant={num === currentPage ? "default" : "outline"}
                      size="sm"
                      data-button-radius="true"
                      data-button-variant={num === currentPage ? (site.button_variant || "solid") : undefined}
                      className="h-8 w-8 min-h-0 p-0 text-xs"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-2.5 py-1 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : (
                <div className="mt-10 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    data-button-radius="true"
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
                    data-button-radius="true"
                    className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )
            ) : null}
          </>
        )}

        <PublicSiteFooter site={site} pages={pages} basePath={basePath} />
      </main>
    </div>
  );
}
