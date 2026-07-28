"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { PublicBlogSearchResult } from "@/lib/types";
import { searchPublicBlogs } from "@/lib/api";
import { getPublicPostUrl } from "@/lib/public-url";

const DEBOUNCE_MS = 250;
const PAGE_SIZE = 5;
const MIN_QUERY_LENGTH = 2;

export function SearchButton({
  iconClassName,
  userName,
}: {
  iconClassName?: string;
  userName: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicBlogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const resultsRef = useRef<HTMLUListElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const requestIdRef = useRef(0);

  const resetState = useCallback(() => {
    setQuery("");
    setResults([]);
    setHasMore(false);
    setHighlightedIndex(-1);
    setError(null);
    offsetRef.current = 0;
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasMore(false);
      setHighlightedIndex(-1);
      offsetRef.current = 0;
      return;
    }

    setLoading(true);
    setError(null);
    offsetRef.current = 0;
    setHighlightedIndex(-1);
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
        setError("Unable to search right now.");
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
    setHighlightedIndex(-1);
    setError(null);
    offsetRef.current = 0;
    inputRef.current?.focus();
  }, []);

  const openSearch = useCallback(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setVisible(true);
      });
    });
  }, []);

  const closeSearch = useCallback(() => {
    setVisible(false);
    triggerRef.current?.focus();
    setTimeout(() => {
      setMounted(false);
      resetState();
    }, 150);
  }, [resetState]);

  const selectResult = useCallback(() => {
    setMounted(false);
    setVisible(false);
    resetState();
    triggerRef.current?.focus();
  }, [resetState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
        if (results[idx]) {
          const slug = results[idx].slug;
          selectResult();
          router.push(getPublicPostUrl(userName, slug));
        }
      }
    },
    [results, highlightedIndex, userName, router, selectResult]
  );

  useEffect(() => {
    if (highlightedIndex < 0 || !resultsRef.current) return;
    const items = resultsRef.current.children;
    if (items[highlightedIndex]) {
      (items[highlightedIndex] as HTMLElement).scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (mounted) {
      inputRef.current?.focus();
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeSearch();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, closeSearch]);

  const trimmed = query.trim();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Search posts"
        onClick={openSearch}
        className={
          iconClassName ??
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:bg-white hover:text-foreground"
        }
      >
        <Search className="h-4 w-4" />
      </button>

      {mounted ? (
        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-150 ease-out ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
            onClick={closeSearch}
          />

          <div
            className={`fixed left-1/2 top-20 z-50 w-[32rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xl transition-all duration-150 ease-out ${
              visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            role="dialog"
            aria-label="Search posts"
          >
            <div className="p-3 pb-2">
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
                  placeholder="Search posts..."
                  aria-label="Search posts"
                  className="h-11 min-h-11 rounded-xl border-border/80 !bg-white pl-9 pr-9"
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

            {error ? (
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {error}
                </div>
              </div>
            ) : !trimmed ? (
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Search posts by title or content
                </div>
              </div>
            ) : trimmed.length < MIN_QUERY_LENGTH ? (
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters
                </div>
              </div>
            ) : loading ? (
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto overscroll-contain">
                  {results.length > 0 ? (
                    <ul ref={resultsRef} className="py-1">
                      {results.map((blog, i) => (
                        <li key={blog.blog_id}>
                          <Link
                            href={getPublicPostUrl(userName, blog.slug)}
                            onClick={selectResult}
                            onMouseEnter={() => setHighlightedIndex(i)}
                            className={`block px-4 py-3 text-sm transition-colors ${
                              i === highlightedIndex ? "bg-muted/50" : ""
                            }`}
                          >
                          <span className="line-clamp-1 font-medium text-base">
                            {blog.title}
                          </span>
                          <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {blog.excerpt}
                          </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No posts match your search
                    </div>
                  )}
                </div>
                {results.length > 0 && hasMore ? (
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
        </>
      ) : null}
    </>
  );
}
