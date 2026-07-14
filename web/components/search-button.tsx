"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { PublicBlog } from "@/lib/types";
import { searchPublicBlogs } from "@/lib/api";
import { getPublicPostUrl } from "@/lib/public-url";

const TRAY_GAP_PX = 8;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 5;

export function SearchButton({
  iconClassName,
  trayClassName,
  userName,
  useCustomDomain,
}: {
  iconClassName?: string;
  trayClassName?: string;
  userName: string;
  useCustomDomain?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicBlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
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
    if (!trimmed) {
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
      if (event.key === "Escape") setOpen(false);
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts"
                aria-label="Search posts"
                className="h-10 min-h-10 rounded-lg border-border/80 !bg-white pl-9"
                autoFocus
              />
            </div>
          </div>

          {query.trim() ? (
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
                          href={getPublicPostUrl(userName, blog.slug, {
                            customDomain: useCustomDomain,
                          })}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2.5 text-sm hover:bg-muted/50"
                        >
                          <span className="line-clamp-1">{blog.title}</span>
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
