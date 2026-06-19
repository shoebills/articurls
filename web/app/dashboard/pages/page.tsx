"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, archivePage, deletePage, listPages, publishPage, apiCacheHas, getCachedApiData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserPage } from "@/lib/types";
import { MARKETING_ORIGIN } from "@/lib/env";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { PromptDialog } from "@/components/prompt-dialog";
import { getContentExcerpt } from "@/lib/utils";
import { format } from "date-fns";
import { Archive, ArchiveRestore, ArrowUpDown, Check, Filter, MoreVertical, Pencil, Search, Share2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { scoreByTitleAndContent } from "@/lib/search";

export default function PagesDashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<UserPage[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? (getCachedApiData<UserPage[]>("/pages/", t) ?? []) : [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/pages/", t);
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [unarchiveId, setUnarchiveId] = useState<number | null>(null);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "archived" | "draft">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
  const [page, setPage] = useState(1);

  const PAGES_PER_PAGE = 10;

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const rows = await listPages(token);
      setPages(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPages = useMemo(() => {
    const compareBySort = (a: UserPage, b: UserPage) => {
      if (sortBy === "oldest") {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    };

    const byStatus =
      statusFilter === "all"
        ? pages
        : pages.filter((p) => p.status === statusFilter);

    const trimmed = query.trim();
    if (!trimmed) {
      const rows = [...byStatus];
      rows.sort(compareBySort);
      return rows;
    }
    return byStatus
      .map((p) => ({
        page: p,
        score: scoreByTitleAndContent(p.title || "", p.content || "", trimmed),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return compareBySort(a.page, b.page);
      })
      .map((row) => row.page);
  }, [pages, query, sortBy, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / PAGES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedPages = useMemo(() => {
    const start = (currentPage - 1) * PAGES_PER_PAGE;
    return filteredPages.slice(start, start + PAGES_PER_PAGE);
  }, [filteredPages, currentPage]);

  async function confirmDelete() {
    if (!token || deleteId == null) return;
    try {
      await deletePage(token, deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete page");
    }
  }

  async function confirmArchive() {
    if (!token || archiveId == null) return;
    setRowBusyId(archiveId);
    setErr(null);
    try {
      await archivePage(token, archiveId);
      setArchiveId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to archive page");
    } finally {
      setRowBusyId(null);
    }
  }

  async function confirmUnarchive() {
    if (!token || unarchiveId == null) return;
    setRowBusyId(unarchiveId);
    setErr(null);
    try {
      await publishPage(token, unarchiveId);
      setUnarchiveId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to unarchive page");
    } finally {
      setRowBusyId(null);
    }
  }

  function onArchive(pageId: number) {
    setArchiveId(pageId);
  }

  function onUnarchive(pageId: number) {
    setUnarchiveId(pageId);
  }

  async function onShare(page: UserPage) {
    if (!token || !user) return;
    const hasCustomDomain = !!(user.custom_domain && (user.domain_status === "active" || user.domain_status === "grace"));
    const base = hasCustomDomain
      ? `https://${user.custom_domain}`
      : `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}`;
    const url = `${base}/page/${encodeURIComponent(page.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setShareUrl(url);
      setShareDialogOpen(true);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:block">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your pages</h1>
          <Button
            asChild
            size="icon"
            className="h-10 w-10 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:hidden"
            aria-label="Create new page"
          >
            <Link href="/dashboard/pages/new">
              <span className="text-xl leading-none">+</span>
            </Link>
          </Button>
        </div>
        <Button
          asChild
          className="hidden h-11 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex"
        >
          <Link href="/dashboard/pages/new">+ New Page</Link>
        </Button>
      </div>

      {loading ? (
        <>
          <div className="mb-4 flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl sm:h-11 sm:max-w-[42rem]" />
            <Skeleton className="h-12 w-20 rounded-xl sm:h-11" />
            <Skeleton className="h-12 w-20 rounded-xl sm:h-11" />
          </div>
          <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 sm:p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : pages.length === 0 ? (
        <div
          className="mt-2 flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-14 text-center transition-colors duration-200"
          role="status"
          aria-label="No pages yet"
        >
          <p className="text-base font-medium text-foreground">No pages yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first page and add it to your menu from Design.
          </p>
          <Button onClick={() => router.push("/dashboard/pages/new")}>
            Add new page
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-[42rem]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search pages"
                className="h-12 min-h-12 rounded-xl border-border/80 bg-white pl-10 sm:h-11 sm:min-h-11"
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {filteredPages.length > 0 ? (
            <>
              <ul className="space-y-4">
                {pagedPages.map((p) => (
                  <li key={p.page_id}>
                    <Card
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("[data-card-action='true']")) return;
                        router.push(`/dashboard/pages/${p.page_id}/edit`);
                      }}
                      onKeyDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("[data-card-action='true']")) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/dashboard/pages/${p.page_id}/edit`);
                        }
                      }}
                      className="cursor-pointer rounded-xl border border-[#e5e7eb] bg-white transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <CardContent className="space-y-4 p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 text-left space-y-1">
                            <p className="truncate text-lg font-medium leading-snug tracking-tight text-slate-900">
                              {p.title || "Untitled"}
                            </p>
                            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                              {getContentExcerpt(p.content).trim() ? getContentExcerpt(p.content) : "No preview yet — open the editor to add content."}
                            </p>
                          </div>
                          <div className="shrink-0" data-card-action="true">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  data-card-action="true"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-700"
                                  aria-label={`Actions for ${p.title || "Untitled"}`}
                                  disabled={rowBusyId === p.page_id}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent data-card-action="true" align="end" className="w-44">
                                <DropdownMenuItem data-card-action="true" asChild>
                                  <Link href={`/dashboard/pages/${p.page_id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {(p.status === "published" || p.status === "archived") && (
                                  <DropdownMenuItem
                                    data-card-action="true"
                                    onClick={() => void onShare(p)}
                                    disabled={rowBusyId === p.page_id}
                                  >
                                    <Share2 className="h-4 w-4" />
                                    Copy link
                                  </DropdownMenuItem>
                                )}
                                {p.status === "published" && (
                                  <DropdownMenuItem
                                    data-card-action="true"
                                    onClick={() => void onArchive(p.page_id)}
                                    disabled={rowBusyId === p.page_id}
                                  >
                                    <Archive className="h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                {p.status === "archived" && (
                                  <DropdownMenuItem
                                    data-card-action="true"
                                    onClick={() => void onUnarchive(p.page_id)}
                                    disabled={rowBusyId === p.page_id}
                                  >
                                    <ArchiveRestore className="h-4 w-4" />
                                    Unarchive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  data-card-action="true"
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onClick={() => setDeleteId(p.page_id)}
                                  disabled={rowBusyId === p.page_id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex items-center gap-x-2 gap-y-2 text-xs text-slate-500">
                          <BlogStatusBadge status={p.status} className="shrink-0" />
                          <span className="text-slate-300 select-none" aria-hidden>
                            ·
                          </span>
                          {p.status === "published" && p.published_at ? (
                            <span className="whitespace-nowrap">Published {format(new Date(p.published_at), "MMM d, yyyy")}</span>
                          ) : (
                            <span className="whitespace-nowrap">Updated {format(new Date(p.updated_at), "MMM d, yyyy")}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-border/70 bg-white px-3 py-2 sm:px-4">
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
            <div className="rounded-xl border border-border/70 bg-white px-4 py-3 text-sm text-muted-foreground">
              No pages match your search.
            </div>
          )}
        </>
      )}

      <Dialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={archiveId != null} onOpenChange={(o) => !o && setArchiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive this page?</DialogTitle>
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
            <DialogTitle>Unarchive this page?</DialogTitle>
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

      {/* Share Link Dialog */}
      <PromptDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title="Share Link"
        description="Copy this link to share your page."
        defaultValue={shareUrl}
        onConfirm={() => {}}
        readOnly
      />
    </div>
  );
}
