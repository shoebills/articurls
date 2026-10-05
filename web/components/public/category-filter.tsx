"use client";

import { useMemo, useState } from "react";
import type { PublicBlog, PublicSite, Category } from "@/lib/types";
import { PublicFeed } from "@/components/public/feed";

type PublicCategoryFilterProps = {
  blogs: PublicBlog[];
  subdomain: string;
  site: PublicSite;
  basePath?: string;
  categories?: Category[];
  showExcerpt?: boolean;
};

export function PublicCategoryFilter({
  blogs,
  subdomain,
  site,
  basePath = "",
  categories = [],
  showExcerpt = true,
}: PublicCategoryFilterProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeCategory = activeId
    ? categories.find((c) => c.category_id === activeId) ?? null
    : null;

  const filteredBlogs = useMemo(
    () =>
      activeId
        ? blogs.filter((b) => b.category_ids?.includes(activeId))
        : blogs,
    [blogs, activeId]
  );

  return (
    <>
      {categories.length > 0 && (
        <div
          role="tablist"
          aria-label="Filter posts by category"
          className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide border-b border-border/40"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeId === null}
            onClick={() => setActiveId(null)}
            className={
              activeId === null
                ? "px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium shrink-0"
                : "px-4 py-1.5 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0"
            }
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              type="button"
              role="tab"
              aria-selected={activeId === c.category_id}
              onClick={() => setActiveId(c.category_id)}
              className={
                activeId === c.category_id
                  ? "px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium shrink-0"
                  : "px-4 py-1.5 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors shrink-0"
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <PublicFeed
        blogs={filteredBlogs}
        subdomain={subdomain}
        site={site}
        basePath={basePath}
        categories={categories}
        showExcerpt={showExcerpt}
        emptyMessage={
          activeCategory
            ? `No posts in ${activeCategory.name} yet.`
            : undefined
        }
      />
    </>
  );
}