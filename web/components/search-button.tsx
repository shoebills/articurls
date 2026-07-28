"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { PublicBlogSearchResult } from "@/lib/types";
import { searchPublicBlogs } from "@/lib/api";
import { getPublicPostUrl } from "@/lib/public-url";

const TRAY_GAP_PX = 8;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 5;
const MIN_QUERY_LENGTH = 2;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function SearchButton({
  iconClassName,
  trayClassName,
  userName,
}: {
  iconClassName?: string;
  trayClassName?: string;
  userName: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicBlogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const requestIdRef = useRef(0);
  const [trayLayout, setTrayLayout] = useState<{
    bottom: number;
    right: number;
    windowWidth: number;
  } | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasMore(false);
      offsetRef.current = 0;
      return;
    }

    setLoading(true);
    offsetRef.current = 0;
    const rid = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchPublicBlogs(userName, trimmed, 0);
        if (requestIdRef.current !== rid) return;
        setResults(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (requestIdRef.current !== rid) return;
        setResults([]);
        setHasMore(false);
      } finally {
        if (requestIdRef.current === rid) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, userName]);

  const handleShowMore = useCallback(async () => {
    const nextOffset = offsetRef.current + PAGE_SIZE;
    const rid = ++requestIdRef.current;
    setLoadingMore(true);
    try {
      const data = await searchPublicBlogs(userName, query.trim(), nextOffset);
      if (requestIdRef.current !== rid) return;
      setResults((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current = nextOffset;
    } catch {
      // keep existing results
    } finally {
      if (requestIdRef.current === rid) {
        setLoadingMore(false);
      }
    }
  }, [userName, query]);

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasMore(false);
    offsetRef.current = 0;
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && results.length > 0) {
        setOpen(false);
        router.push(getPublicPostUrl(userName, results[0].slug));
      }
    },
    [results, userName, router]
  );

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root || !open) return;
    const rootBox = root.getBoundingClientRect();
    setTrayLayout({
      bottom: rootBox.bottom,
      right: rootBox.right,
      windowWidth: window.innerWidth,
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTrayLayout(null);
      setQuery("");
      setResults([]);
      setHasMore(false);
      offsetRef.current = 0;
      return;
    }
    const timer = requestAnimationFrame(() => measure());
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true });
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (target instanceof Element && target.closest('[role="dialog"]')) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const trimmed = query.trim();

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Search posts"
        onClick={() => setOpen((prev) => !prev)}
        className={
          iconClassName ??
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:bg-white hover:text-foreground"
        }
      >
        <Search className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={
            trayClassName ??
            "fixed z-50 w-[25rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/80 bg-white shadow-lg transition-opacity duration-200 ease-out"
          }
          style={
            trayLayout
              ? {
                  top: trayLayout.bottom + TRAY_GAP_PX,
                  right: trayLayout.windowWidth - trayLayout.right,
                }
              : undefined
          }
          role="dialog"
          aria-label="Search posts"
        >
          <div className="p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search posts"
                aria-label="Search posts"
                className="h-10 min-h-10 rounded-lg border-border/80 !bg-white pl-9 pr-9"
                autoFocus
              />
              {query ? (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {!trimmed ? (
            <div className="border-t border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Search posts by title or topic...
            </div>
          ) : trimmed.length < MIN_QUERY_LENGTH ? (
            <div className="border-t border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters
            </div>
          ) : (
            <>
              <div className="border-t border-border/70">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto py-1">
                    {results.map((blog) => (
                      <li key={blog.blog_id}>
                        <Link
                          href={getPublicPostUrl(userName, blog.slug)}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2.5 text-sm hover:bg-muted/50"
                        >
                          <span className="line-clamp-1 font-medium">
                            {blog.title}
                          </span>
                          <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {formatDate(blog.published_at)}
                            {blog.excerpt ? (
                              <> &middot; {blog.excerpt}</>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-4 text-center text-sm text-muted-foreground">
                    No posts match your search
                  </p>
                )}
              </div>
              {hasMore && !loading ? (
                <div className="border-t border-border/70 px-4 py-2">
                  {loadingMore ? (
                    <div className="flex items-center justify-center py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleShowMore}
                      className="w-full rounded-md py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      Show more
                    </button>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
