"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listBlogs, deleteBlog, archiveBlog, publishBlog, ApiError, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogListItem } from "@/lib/types";
import { UGC_ORIGIN, UGC_DOMAIN } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Archive, ArchiveRestore, ArrowUpDown, Check, ExternalLink, Filter, MoreVertical, PenLine, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Input } from "@/components/ui/input";
import { precomputeSearchItem, scoreSearch } from "@/lib/search";
import { resolveBlogContentThumbnail } from "@/lib/blog-images";

const POSTS_PER_PAGE = 10;

export default function PostsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [blogs, setBlogs] = useState<BlogListItem[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    if (!t) return [];
    const cached = getCachedApiData<BlogListItem[]>("/blog/", t);
    if (cached) {
      return [...cached].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/blog/", t);
  });
  const [err, setErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [unarchiveId, setUnarchiveId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [menuOpenBlogId, setMenuOpenBlogId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "archived" | "draft" | "scheduled">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await listBlogs(token);
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBlogs(data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      debounceRef.current = null;
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function confirmDelete() {
    if (!token || deleteId == null) return;
    try {
      await deleteBlog(token, deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Delete failed");
    }
  }

  async function confirmArchive() {
    if (!token || archiveId == null) return;
    setRowBusyId(archiveId);
    setErr(null);
    try {
      await archiveBlog(token, archiveId);
      setArchiveId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Archive failed");
    } finally {
      setRowBusyId(null);
    }
  }

  async function confirmUnarchive() {
    if (!token || unarchiveId == null) return;
    setRowBusyId(unarchiveId);
    setErr(null);
    try {
      await publishBlog(token, unarchiveId);
      setUnarchiveId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not unarchive post");
    } finally {
      setRowBusyId(null);
    }
  }

  function handleArchive(id: number) {
    setArchiveId(id);
  }

  function handlePublishAgain(id: number) {
    setUnarchiveId(id);
  }

  function openEditor(blogId: number) {
    router.push(`/dashboard/posts/${blogId}/edit`);
  }

  function handleViewPost(blog: BlogListItem) {
    if (!user) return;
    const hasCustomDomain = !!(user.custom_domain && (user.domain_status === "active" || user.domain_status === "grace"));
    const base = hasCustomDomain
      ? `https://${user.custom_domain}`
      : `https://${encodeURIComponent(user.user_name)}.${UGC_DOMAIN}`;
    const url = `${base}/blog/${encodeURIComponent(blog.slug)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const searchIndex = useMemo(() => {
    const map = new Map<number, ReturnType<typeof precomputeSearchItem>>();
    for (const blog of blogs) {
      map.set(blog.blog_id, precomputeSearchItem(blog.title || "", blog.content || ""));
    }
    return map;
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    const compareBySort = (a: BlogListItem, b: BlogListItem) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    const byStatus =
      statusFilter === "all"
        ? blogs
        : blogs.filter((blog) => {
            if (statusFilter === "draft") return blog.status === "draft" || blog.status === "scheduled";
            return blog.status === statusFilter;
          });

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      const rows = [...byStatus];
      rows.sort(compareBySort);
      return rows;
    }
    return byStatus
      .map((blog) => {
        const pre = searchIndex.get(blog.blog_id);
        if (!pre) return { blog, score: 0 };
        return { blog, score: scoreSearch(pre, trimmed) };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return compareBySort(a.blog, b.blog);
      })
      .map((row) => row.blog);
  }, [blogs, debouncedQuery, sortBy, statusFilter, searchIndex]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [filteredBlogs, currentPage]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:block">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your posts</h1>
          <Button
            asChild
            size="icon"
            className="h-10 w-10 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:hidden"
            aria-label="Create new post"
          >
            <Link href="/dashboard/posts/new">
              <span className="text-xl leading-none">+</span>
            </Link>
          </Button>
        </div>
        <Button asChild className="hidden h-11 shrink-0 touch-manipulation gap-2 bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex">
          <Link href="/dashboard/posts/new">
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-[42rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search posts"
            className={`h-10 min-h-10 rounded-xl border-border/80 bg-white pl-10 sm:h-11 sm:min-h-11 ${query.length > 0 ? "pr-10" : "pr-4"}`}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => { setQuery(""); setDebouncedQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-10 min-h-10 gap-2 rounded-xl px-3 sm:h-11 sm:min-h-11 sm:px-3.5">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("published")}>Published</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("scheduled")}>Scheduled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-10 min-h-10 gap-2 rounded-xl px-3 sm:h-11 sm:min-h-11 sm:px-3.5">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">Sort</span>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="aspect-[3/2] w-24 shrink-0 rounded-md sm:w-36" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
      ) : (
        <>
        {blogs.length > 0 ? (
        filteredBlogs.length > 0 ? (
          <>
            <ul className="space-y-4">
          {pagedBlogs.map((b) => {
            return (
            <li key={b.blog_id}>
              <Card
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-card-action='true']")) return;
                  openEditor(b.blog_id);
                }}
                onKeyDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-card-action='true']")) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEditor(b.blog_id);
                  }
                }}
                className="cursor-pointer rounded-xl border border-[#e5e7eb] bg-white transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="truncate text-lg font-medium leading-snug tracking-tight text-slate-900">
                        {b.title || "Untitled"}
                      </h2>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                        {b.excerpt?.trim() ? b.excerpt : "No preview yet — open the editor to add content."}
                      </p>
                    </div>
                    {resolveBlogContentThumbnail(b) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveBlogContentThumbnail(b)}
                        alt=""
                        className="aspect-[3/2] w-24 shrink-0 rounded-md border border-border/70 object-cover sm:w-36"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.625rem] sm:text-xs text-slate-500">
                    {b.status === "scheduled" && b.scheduled_at ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold tracking-tight text-amber-700 shadow-sm shrink-0">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-pulse" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/40" />
                          </span>
                          Scheduled {format(new Date(b.scheduled_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </>
                    ) : (
                      <BlogStatusBadge status={b.status} className="shrink-0 !text-[0.625rem] sm:!text-xs" />
                    )}
                    {b.status !== "scheduled" && (
                      <>
                        <span className="text-slate-300 select-none" aria-hidden>
                          ·
                        </span>
                        {b.status === "published" && b.published_at ? (
                          <span className="whitespace-nowrap">Published {format(new Date(b.published_at), "MMM d, yyyy")}</span>
                        ) : (
                          <span className="whitespace-nowrap">Updated {format(new Date(b.updated_at), "MMM d, yyyy")}</span>
                        )}
                      </>
                    )}
                    <div className="ml-auto">
                      <DropdownMenu open={menuOpenBlogId === b.blog_id} onOpenChange={(open) => { if (!open) setMenuOpenBlogId(null); }}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-card-action="true"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-slate-500 hover:text-slate-700"
                            aria-label={`Actions for ${b.title || "Untitled"}`}
                          disabled={rowBusyId === b.blog_id}
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => setMenuOpenBlogId(b.blog_id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent data-card-action="true" align="end" className="w-48">
                        <DropdownMenuItem data-card-action="true" asChild>
                          <Link href={`/dashboard/posts/${b.blog_id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {(b.status === "published") && (
                          <DropdownMenuItem data-card-action="true" onClick={() => handleViewPost(b)}>
                            <ExternalLink className="h-4 w-4" />
                            View post
                          </DropdownMenuItem>
                        )}
                        {b.status === "published" && (
                          <DropdownMenuItem
                            data-card-action="true"
                            onClick={() => handleArchive(b.blog_id)}
                            disabled={rowBusyId === b.blog_id}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {b.status === "archived" && (
                          <DropdownMenuItem
                            data-card-action="true"
                            onClick={() => handlePublishAgain(b.blog_id)}
                            disabled={rowBusyId === b.blog_id}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            Unarchive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          data-card-action="true"
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => setDeleteId(b.blog_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
            );
          })}
            </ul>
            <div className="mt-5 flex items-center justify-between">
              <Button variant="outline" size="sm" className="h-8 min-h-0 px-3 py-1.5" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                Prev
              </Button>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Page {currentPage} of {totalPages}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 min-h-0 px-3 py-1.5"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-sm text-muted-foreground">
            No posts match your search.
          </div>
        )
      ) : (
        <div
          className="mt-10 flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-14 text-center transition-colors duration-200 sm:min-h-[260px]"
          role="status"
          aria-label="No posts yet"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm ring-1 ring-border/60">
            <PenLine className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium text-foreground">No posts yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first draft. You can edit and publish whenever you are ready.
            </p>
          </div>
        </div>
      )}
        </>
      )}

      <Dialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={archiveId != null} onOpenChange={(o) => !o && setArchiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this post?</DialogTitle>
            <DialogDescription>Move this post to your archive.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveId(null)}>
              Cancel
            </Button>
            <Button onClick={confirmArchive}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={unarchiveId != null} onOpenChange={(o) => !o && setUnarchiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unarchive this post?</DialogTitle>
            <DialogDescription>Restore the post so it appears in your published list again.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnarchiveId(null)}>
              Cancel
            </Button>
            <Button onClick={confirmUnarchive}>
              Unarchive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
