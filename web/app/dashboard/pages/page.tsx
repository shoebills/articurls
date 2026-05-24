"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, archivePage, deletePage, listPages, publishPage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { format } from "date-fns";
import { Archive, ArchiveRestore, MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";

export default function PagesDashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const rows = await listPages(token);
      setPages(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onDelete(pageId: number) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await deletePage(token, pageId);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete page");
    } finally {
      setBusy(false);
    }
  }

  async function onArchive(pageId: number) {
    if (!token) return;
    setRowBusyId(pageId);
    setErr(null);
    try {
      await archivePage(token, pageId);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to archive page");
    } finally {
      setRowBusyId(null);
    }
  }

  async function onUnarchive(pageId: number) {
    if (!token) return;
    setRowBusyId(pageId);
    setErr(null);
    try {
      await publishPage(token, pageId);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to unarchive page");
    } finally {
      setRowBusyId(null);
    }
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
      window.prompt("Copy link:", url);
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
            disabled={busy}
          >
            <Link href="/dashboard/pages/new">
              <span className="text-xl leading-none">+</span>
            </Link>
          </Button>
        </div>
        <Button
          asChild
          className="hidden h-11 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex"
          disabled={busy}
        >
          <Link href="/dashboard/pages/new">+ New Page</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pages.length === 0 ? (
        <div className="mt-2 flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dotted border-border bg-muted/25 px-6 py-10 text-center">
          <p className="text-base font-medium">No pages yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first page and add it to your menu from Design.
          </p>
          <Button onClick={() => router.push("/dashboard/pages/new")} disabled={busy}>
            Add new page
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {pages.map((p) => (
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
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-lg font-medium leading-snug tracking-tight text-slate-900">
                        {p.title || "Untitled"}
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
                            disabled={busy || rowBusyId === p.page_id}
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
                              disabled={busy || rowBusyId === p.page_id}
                            >
                              <Share2 className="h-4 w-4" />
                              Copy link
                            </DropdownMenuItem>
                          )}
                          {p.status === "published" && (
                            <DropdownMenuItem
                              data-card-action="true"
                              onClick={() => void onArchive(p.page_id)}
                              disabled={busy || rowBusyId === p.page_id}
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {p.status === "archived" && (
                            <DropdownMenuItem
                              data-card-action="true"
                              onClick={() => void onUnarchive(p.page_id)}
                              disabled={busy || rowBusyId === p.page_id}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                              Unarchive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            data-card-action="true"
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => void onDelete(p.page_id)}
                            disabled={busy || rowBusyId === p.page_id}
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
                    <span className="whitespace-nowrap">Updated {format(new Date(p.updated_at), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
