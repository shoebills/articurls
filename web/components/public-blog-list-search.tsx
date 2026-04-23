"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { PublicBlog } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";

type PublicBlogListSearchProps = {
  blogs: PublicBlog[];
  username: string;
};

export function PublicBlogListSearch({ blogs, username }: PublicBlogListSearchProps) {
  const [query, setQuery] = useState("");

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <p className="text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  const sortedBlogs = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return blogs;

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

  return (
    <section className="mt-5 sm:mt-6">
      <div className="relative mb-6 sm:mb-8">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts by title or content"
          aria-label="Search posts"
          className="h-11 rounded-xl border-border/80 bg-background pl-10"
        />
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
