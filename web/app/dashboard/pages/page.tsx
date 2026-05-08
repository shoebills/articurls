"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, archivePage, deletePage, listPages, publishPage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
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
import { Archive, ArchiveRestore, MoreVertical, Pencil, Trash2 } from "lucide-react";

export default function PagesDashboardPage() {
  const { token, isPro } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const limit = isPro ? 10 : 1;

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

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your pages</h1>
        <Button
          onClick={() => router.push("/dashboard/pages/new")}
          disabled={busy || pages.length >= limit}
        >
          Add new page
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{pages.length}/{limit} pages</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : pages.length === 0 ? (
        <div className="mt-2 flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dotted border-border bg-muted/25 px-6 py-10 text-center">
          <p className="text-base font-medium">No pages yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Create your first page and add it to your menu from Design.
          </p>
          <Button onClick={() => router.push("/dashboard/pages/new")} disabled={busy || pages.length >= limit}>
            Add new page
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {pages.map((p) => (
            <li key={p.page_id}>
              <Card className="rounded-xl border border-[#e5e7eb] bg-white transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-sm">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-lg font-medium leading-snug tracking-tight text-slate-900">
                      {p.title || "Untitled"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-500">
                    <BlogStatusBadge status={p.status} className="shrink-0" />
                    <span className="text-slate-300 select-none" aria-hidden>
                      ·
                    </span>
                    <span className="whitespace-nowrap">Updated {format(new Date(p.updated_at), "MMM d, yyyy")}</span>
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-700"
                            aria-label={`Actions for ${p.title || "Untitled"}`}
                            disabled={busy || rowBusyId === p.page_id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/pages/${p.page_id}/edit`}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {p.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => void onArchive(p.page_id)}
                              disabled={busy || rowBusyId === p.page_id}
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {p.status === "archived" && (
                            <DropdownMenuItem
                              onClick={() => void onUnarchive(p.page_id)}
                              disabled={busy || rowBusyId === p.page_id}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                              Unarchive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
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
