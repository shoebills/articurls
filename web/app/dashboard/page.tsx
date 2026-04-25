"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listBlogs, deleteBlog, archiveBlog, publishBlog, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogListItem } from "@/lib/types";
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
import { Archive, ArchiveRestore, ArrowUpDown, Check, Filter, MoreVertical, PenLine, Pencil, Search, Trash2 } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";
import { resolveBlogPreviewImage } from "@/lib/blog-images";

const POSTS_PER_PAGE = 10;

export default function DashboardPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "archived" | "draft">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "most_popular">("latest");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const data = await listBlogs(token);
      data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
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

  async function handleArchive(id: number) {
    if (!token) return;
    setRowBusyId(id);
    setErr(null);
    try {
      await archiveBlog(token, id);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Archive failed");
    } finally {
      setRowBusyId(null);
    }
  }

  async function handlePublishAgain(id: number) {
    if (!token) return;
    setRowBusyId(id);
    setErr(null);
    try {
      await publishBlog(token, id);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not publish post");
    } finally {
      setRowBusyId(null);
    }
  }

  function openEditor(blogId: number) {
    router.push(`/dashboard/posts/${blogId}/edit`);
  }

  const filteredBlogs = useMemo(() => {
    const compareBySort = (a: BlogListItem, b: BlogListItem) => {
      if (sortBy === "most_popular") {
        const byViews = (b.view_count ?? 0) - (a.view_count ?? 0);
        if (byViews !== 0) return byViews;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    };

    const byStatus =
      statusFilter === "all"
        ? blogs
        : blogs.filter((blog) => {
            if (statusFilter === "draft") return blog.status === "draft" || blog.status === "scheduled";
            return blog.status === statusFilter;
          });

    const trimmed = query.trim();
    if (!trimmed) {
      const rows = [...byStatus];
      rows.sort(compareBySort);
      return rows;
    }
    return byStatus
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
  }, [blogs, query, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedBlogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredBlogs.slice(start, start + POSTS_PER_PAGE);
  }, [filteredBlogs, currentPage]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your posts</h1>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
        <Button asChild className="hidden h-11 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex">
          <Link href="/dashboard/posts/new">+ New Post</Link>
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
            className="h-12 min-h-12 rounded-xl border-border/80 bg-background pl-10 sm:h-11 sm:min-h-11"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-12 min-h-12 gap-2 rounded-xl px-3 sm:h-11 sm:min-h-11 sm:px-3.5">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("published")}>Published</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("draft")}>Draft</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="h-12 min-h-12 gap-2 rounded-xl px-3 sm:h-11 sm:min-h-11 sm:px-3.5">
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
            <DropdownMenuItem onClick={() => setSortBy("most_popular")}>
              <Check className={`h-4 w-4 ${sortBy === "most_popular" ? "opacity-100" : "opacity-0"}`} />
              Most popular
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {blogs.length > 0 ? (
        filteredBlogs.length > 0 ? (
          <>
            <ul className="space-y-4">
          {pagedBlogs.map((b) => {
            const views = typeof b.view_count === "number" ? b.view_count : 0;
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
                  <div className="flex items-start gap-3">
                    <h2 className="min-w-0 flex-1 text-lg font-medium leading-snug tracking-tight text-slate-900">
                      {b.title || "Untitled"}
                    </h2>
                    {resolveBlogPreviewImage(b, user?.use_default_preview_image ?? true) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveBlogPreviewImage(b, user?.use_default_preview_image ?? true)}
                        alt=""
                        className="aspect-[3/2] w-24 shrink-0 rounded-md border border-border/70 object-cover sm:w-36"
                      />
                    ) : null}
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {b.excerpt?.trim() ? b.excerpt : "No preview yet — open the editor to add content."}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-500">
                    <BlogStatusBadge status={b.status} className="shrink-0" />
                    <span className="text-slate-300 select-none" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap">Updated {format(new Date(b.updated_at), "MMM d, yyyy")}</span>
                    <span className="text-slate-300 select-none" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap">
                      {views} view{views === 1 ? "" : "s"}
                    </span>
                    <div className="ml-auto" data-card-action="true">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-card-action="true"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-700"
                            aria-label={`Actions for ${b.title || "Untitled"}`}
                            disabled={rowBusyId === b.blog_id}
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
          </>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            No posts match your search.
          </div>
        )
      ) : (
        <div
          className="mt-10 flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-14 text-center transition-colors duration-200 sm:min-h-[260px]"
          role="status"
          aria-label="No posts yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/60">
            <PenLine className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium text-foreground">No posts yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first draft — you can edit and publish whenever you are ready.
            </p>
          </div>
          <Button asChild className="touch-manipulation">
            <Link href="/dashboard/posts/new">+ New post</Link>
          </Button>
        </div>
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
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
