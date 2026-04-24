"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, Link2, MessageCircle, Search, Share2 } from "lucide-react";
import type { PublicBlog } from "@/lib/types";
import { MARKETING_ORIGIN } from "@/lib/env";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  username: string;
};

const POSTS_PER_PAGE = 10;

function publicBlogPostUrl(userName: string, slug: string) {
  return `${MARKETING_ORIGIN}/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}`;
}

function BlogPostShareMenu({ userName, slug, title }: { userName: string; slug: string; title: string }) {
  const url = publicBlogPostUrl(userName, slug);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title || "Read this post");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts
      window.prompt("Copy link:", url);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="h-4 w-4" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer">
            <span className="mr-2 grid w-4 place-items-center text-[13px] font-bold" aria-hidden>
              X
            </span>
            Share on X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            Share on WhatsApp
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PublicBlogListSearch({ blogs, username }: PublicBlogListSearchProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "most_popular">("latest");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return sortedBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [sortedBlogs, currentPage]);

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
        {pagedBlogs.map((b) => (
          <li key={b.blog_id} className="py-8 first:pt-0">
            <div className="rounded-xl py-1">
              <Link href={`/${username}/blog/${b.slug}`} className="group block transition-colors hover:bg-muted/30">
                <h3 className="text-lg font-semibold tracking-tight group-hover:text-primary group-hover:underline decoration-primary/30 underline-offset-4 sm:text-xl">
                  {b.title}
                </h3>
                {b.excerpt && <p className="mt-2 line-clamp-2 text-muted-foreground">{b.excerpt}</p>}
              </Link>
              <div className="mt-3 flex items-center justify-between gap-2">
                {b.published_at ? (
                  <time className="text-xs text-muted-foreground" dateTime={b.published_at}>
                    {new Date(b.published_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                ) : (
                  <span className="text-xs text-muted-foreground" aria-hidden />
                )}
                <BlogPostShareMenu userName={username} slug={b.slug} title={b.title} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sortedBlogs.length > 0 ? (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 sm:px-4">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {sortedBlogs.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No posts match your search.
        </p>
      )}
    </section>
  );
}
