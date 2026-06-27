"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, Link2, Search, Share2 } from "lucide-react";
import { SiInstagram, SiWhatsapp, SiX } from "react-icons/si";
import type { PublicBlog, PublicUser } from "@/lib/types";
import { MARKETING_ORIGIN } from "@/lib/env";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { resolveBlogCoverImage } from "@/lib/blog-images";
import { getPublicPostUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";
import { PromptDialog } from "@/components/prompt-dialog";

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

function BlogPostShareMenu({
  userName,
  slug,
  title,
  useCustomDomain = false,
  siteOrigin,
}: {
  userName: string;
  slug: string;
  title: string;
  useCustomDomain?: boolean;
  siteOrigin?: string;
}) {
  const url = publicBlogPostUrl(userName, slug, useCustomDomain, siteOrigin);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title || "Read this post");
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts
      setShareUrl(url);
      setDialogOpen(true);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) triggerRef.current?.blur();
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Share post"
          onPointerDown={(e) => {
            if (e.pointerType === "touch") e.preventDefault();
          }}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-white">
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="h-4 w-4" /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer">
            <SiX className="h-4 w-4" /> Share on X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">
            <SiWhatsapp className="h-4 w-4" /> Share on WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <SiInstagram className="h-4 w-4" /> Share on Instagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortMenu({ sortBy, setSortBy }: { sortBy: string; setSortBy: (v: "latest" | "oldest") => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) triggerRef.current?.blur();
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="h-10 min-h-10 gap-2 rounded-xl border-border/80 bg-white px-3 shadow-sm hover:bg-white hover:text-foreground sm:h-11 sm:min-h-11 sm:px-3.5"
          onPointerDown={(e) => {
            if (e.pointerType === "touch") e.preventDefault();
          }}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-white">
        <DropdownMenuItem onClick={() => setSortBy("latest")}>
          <Check className={`h-4 w-4 ${sortBy === "latest" ? "opacity-100" : "opacity-0"}`} />
          Latest
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSortBy("oldest")}>
          <Check className={`h-4 w-4 ${sortBy === "oldest" ? "opacity-100" : "opacity-0"}`} />
          Oldest
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
    <li className="py-8 first:pt-0">
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
              {new Date(b.published_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          ) : (
            <span className="text-xs text-muted-foreground" aria-hidden />
          )}
          <BlogPostShareMenu
            userName={username}
            slug={b.slug}
            title={b.title}
            useCustomDomain={useCustomDomain}
            siteOrigin={siteOrigin}
          />
        </div>
      </div>
    </li>
  );
}

export function PublicBlogListSearch({ blogs, username, user, hideFeatured, useCustomDomain = false, siteOrigin }: PublicBlogListSearchProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
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
    const compareBySort = (a: PublicBlog, b: PublicBlog) => {
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

  const totalPages = Math.max(1, Math.ceil(sortedBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return sortedBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [sortedBlogs, currentPage]);

  if (blogs.length === 0) {
    return (
      <section className="mt-5 sm:mt-6">
        <p className="text-muted-foreground">No published posts yet.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 sm:mt-6">
      <div className="mb-6 flex items-center gap-2 sm:mb-8 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            aria-label="Search posts"
            className="h-10 min-h-10 rounded-xl border-border/80 !bg-white pl-10 sm:h-11 sm:min-h-11"
          />
        </div>
        {!showFeatured && (
          <SortMenu
            sortBy={sortBy}
            setSortBy={(next) => {
              setSortBy(next);
              setPage(1);
            }}
          />
        )}
      </div>

      {showFeatured ? (
        <div className="mb-10 sm:mb-14">
          <h2 className="mb-5 text-xl font-bold tracking-tight sm:mb-6 sm:text-2xl">Featured</h2>
          <ul className="divide-y divide-border/80">
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
        <div className="mb-5 flex items-center justify-between sm:mb-6">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">All posts</h2>
          <SortMenu sortBy={sortBy} setSortBy={setSortBy} />
        </div>
      )}

      <ul className="divide-y divide-border/80">
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
