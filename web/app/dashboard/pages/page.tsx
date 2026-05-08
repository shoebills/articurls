"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, deletePage, listPages } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function PagesDashboardPage() {
  const { token, isPro } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pages</h1>
        <Button
          onClick={() => router.push("/dashboard/pages/new")}
          disabled={busy || pages.length >= limit}
        >
          Add new page
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Pages are static sections like About or Portfolio. Free: 1 page. Pro: up to 10 pages.
      </p>

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
              <Card className="rounded-xl border border-[#e5e7eb] bg-white">
                <CardContent className="flex items-center justify-between gap-2 p-5 sm:p-6">
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-lg font-medium leading-snug tracking-tight text-slate-900">
                      {p.title || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-500">/{p.slug} · {p.status}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" asChild disabled={busy}>
                      <Link href={`/dashboard/pages/${p.page_id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void onDelete(p.page_id)}
                      disabled={busy}
                    >
                      Delete
                    </Button>
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
