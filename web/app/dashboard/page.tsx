"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Archive, ArchiveRestore, Loader2, MoreVertical, PenLine, Pencil, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const { token } = useAuth();
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading posts…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Drafts, scheduled, and published work in one place.</p>
        </div>
        <Button asChild className="h-11 w-full shrink-0 touch-manipulation shadow-sm sm:h-auto sm:w-auto">
          <Link href="/dashboard/posts/new">+ New post</Link>
        </Button>
      </div>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {blogs.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {blogs.map((b) => {
            const views = typeof b.view_count === "number" ? b.view_count : 0;
            return (
            <li key={b.blog_id}>
              <Card className="transition-[box-shadow,border-color] duration-200 hover:border-border hover:shadow-md">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight text-foreground">
                      {b.title || "Untitled"}
                    </h2>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Actions for ${b.title || "Untitled"}`}
                          disabled={rowBusyId === b.blog_id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/posts/${b.blog_id}/edit`}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        {b.status === "published" && (
                          <DropdownMenuItem
                            onClick={() => handleArchive(b.blog_id)}
                            disabled={rowBusyId === b.blog_id}
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        {b.status === "archived" && (
                          <DropdownMenuItem
                            onClick={() => handlePublishAgain(b.blog_id)}
                            disabled={rowBusyId === b.blog_id}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            Publish again
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => setDeleteId(b.blog_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {b.excerpt?.trim() ? b.excerpt : "No preview yet — open the editor to add content."}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
                    <BlogStatusBadge status={b.status} className="shrink-0" />
                    <span className="text-border select-none" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap">Updated {format(new Date(b.updated_at), "MMM d, yyyy")}</span>
                    <span className="text-border select-none" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap">
                      {views} view{views === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="mt-10 flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-border bg-muted/25 px-6 py-14 text-center transition-colors duration-200 sm:min-h-[260px]"
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
    </div>
  );
}
