"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, Search } from "lucide-react";
import type { PublicBlog } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  username: string;
};

export function PublicBlogListSearch({ blogs, username }: PublicBlogListSearchProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "most_popular">("latest");

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <p className="text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  const sortedBlogs = useMemo(() => {
    const compareBySort = (a: PublicBlog, b: PublicBlog) => {
      if (sortBy === "most_popular") {
        const byViews = (b.view_count ?? 0) - (a.view_count ?? 0);
        if (byViews !== 0) return byViews;
        const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
        return bDate - aDate;
      }
      if (sortBy === "oldest") {
        const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
        const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
        return aDate - bDate;
      }
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
      return bDate - aDate;
    };

    const trimmed = query.trim();
    if (!trimmed) {
      const rows = [...blogs];
      rows.sort(compareBySort);
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
        return compareBySort(a.blog, b.blog);
      })
      .map((row) => row.blog);
  }, [blogs, query, sortBy]);

  return (
    <section className="mt-5 sm:mt-6">
      <div className="mb-6 flex items-center gap-2 sm:mb-8 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search posts"
            className="h-12 min-h-12 rounded-xl border-border/80 bg-background pl-10 sm:h-11 sm:min-h-11"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-12 min-h-12 gap-2 rounded-xl px-3 sm:h-11 sm:min-h-11 sm:px-3.5">
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setSortBy("latest")}>
              <Check className={`h-4 w-4 ${sortBy === "latest" ? "opacity-100" : "opacity-0"}`} />
              Latest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>
              <Check className={`h-4 w-4 ${sortBy === "oldest" ? "opacity-100" : "opacity-0"}`} />
              Oldest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("most_popular")}>
              <Check className={`h-4 w-4 ${sortBy === "most_popular" ? "opacity-100" : "opacity-0"}`} />
              Most popular
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ul className="divide-y divide-border/80">
        {sortedBlogs.map((b) => (
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

      {sortedBlogs.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No posts match your search.
        </p>
      )}
    </section>
  );
}
