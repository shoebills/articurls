"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, createPage, deletePage, listPages, updatePage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { BlogEditor } from "@/components/editor/blog-editor";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { MARKETING_ORIGIN } from "@/lib/env";

export default function PagesDashboardPage() {
  const { token, isPro } = useAuth();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);

  // Create form state
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("<p></p>");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("<p></p>");
  const [editSlug, setEditSlug] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaTitleDirty, setEditMetaTitleDirty] = useState(false);
  const [editMetaDesc, setEditMetaDesc] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try {
      const rows = await listPages(token);
      setPages(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load pages");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreate() {
    if (!token) return;
    if (!createTitle.trim()) { setErr("Page title is required"); return; }
    setBusy(true);
    setErr(null);
    try {
      await createPage(token, { title: createTitle.trim(), content: createContent });
      setCreateTitle("");
      setCreateContent("<p></p>");
      setCreating(false);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create page");
    } finally {
      setBusy(false);
    }
  }

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

  const limit = isPro ? 10 : 1;
  const editingPage = useMemo(
    () => pages.find((p) => p.page_id === editingPageId) ?? null,
    [pages, editingPageId]
  );

  // Populate edit form when a page is selected
  useEffect(() => {
    if (!editingPage) return;
    setEditTitle(editingPage.title);
    setEditContent(editingPage.content || "<p></p>");
    setEditSlug(editingPage.slug);
    setEditMetaTitle(editingPage.meta_title || "");
    const metaSynced = !editingPage.meta_title || editingPage.meta_title === editingPage.title;
    setEditMetaTitleDirty(!metaSynced);
    setEditMetaDesc(editingPage.meta_description || "");
    setAdvancedOpen(false);
  }, [editingPage]);

  // Keep meta title in sync with title unless manually edited
  useEffect(() => {
    if (!editMetaTitleDirty) setEditMetaTitle(editTitle);
  }, [editTitle, editMetaTitleDirty]);

  async function onSaveEdit(silent = false) {
    if (!token || !editingPage) return;
    if (!editTitle.trim()) { setErr("Page title is required"); return; }

    const nextTitle = editTitle.trim();
    const nextContent = editContent;
    const nextSlug = editSlug.trim() || editingPage.slug;
    const nextMetaTitle =
      !editMetaTitleDirty || editMetaTitle.trim() === nextTitle
        ? null
        : editMetaTitle.trim() || null;
    const nextMetaDesc = editMetaDesc.trim() || null;

    const dirty =
      editingPage.title !== nextTitle ||
      (editingPage.content || "") !== nextContent ||
      editingPage.slug !== nextSlug ||
      (editingPage.meta_title || null) !== nextMetaTitle ||
      (editingPage.meta_description || null) !== nextMetaDesc;

    if (!dirty) return;

    setBusy(true);
    setSaveStatus("saving");
    if (!silent) setErr(null);
    try {
      const updated = await updatePage(token, editingPage.page_id, {
        title: nextTitle,
        content: nextContent,
        slug: nextSlug !== editingPage.slug ? nextSlug : undefined,
        meta_title: nextMetaTitle,
        meta_description: nextMetaDesc,
      });
      setPages((prev) => prev.map((p) => (p.page_id === updated.page_id ? updated : p)));
      setEditSlug(updated.slug); // sync back in case backend normalized it
      setSaveStatus("saved");
      if (!silent) setEditingPageId(null);
    } catch (e) {
      setSaveStatus("idle");
      setErr(e instanceof ApiError ? e.message : "Failed to save page");
    } finally {
      setBusy(false);
    }
  }

  // Autosave on field changes
  useEffect(() => {
    if (!editingPage || busy) return;
    setSaveStatus("idle");
    const timer = setTimeout(() => { void onSaveEdit(true); }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPage, editTitle, editContent, editSlug, editMetaTitle, editMetaTitleDirty, editMetaDesc]);

  // Flush save on page leave
  useEffect(() => {
    const flush = () => { if (!editingPage || busy) return; void onSaveEdit(true); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("popstate", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("popstate", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPage, editTitle, editContent, editSlug, editMetaTitle, editMetaTitleDirty, editMetaDesc, busy, token]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:block">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pages</h1>
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:hidden"
            onClick={() => { setEditingPageId(null); setCreating(true); }}
            disabled={busy || pages.length >= limit}
            aria-label="Add new page"
          >
            <span className="text-xl leading-none">+</span>
          </Button>
        </div>
        <Button
          className="hidden sm:inline-flex"
          onClick={() => { setEditingPageId(null); setCreating(true); }}
          disabled={busy || pages.length >= limit}
        >
          Add new page
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Pages are static sections like About or Portfolio that appear in your public menu.
      </p>

      {/* Create form */}
      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>Create new page</CardTitle>
            <CardDescription>Free: 1 page. Pro: up to 10 pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Page title"
              disabled={busy}
            />
            <BlogEditor
              blogId={null}
              pageId={null}
              token={token}
              content={createContent}
              onChange={setCreateContent}
              placeholder="Write your page..."
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => { setCreating(false); setCreateTitle(""); setCreateContent("<p></p>"); }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={busy || !createTitle.trim()}>
                Create page
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Edit form */}
      {editingPage && !creating ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Edit page</CardTitle>
              {(() => {
                const pageUrl = user?.custom_domain &&
                  (user.domain_status === "active" || user.domain_status === "grace")
                  ? `https://${user.custom_domain}/page/${encodeURIComponent(editingPage.slug)}`
                  : user?.user_name
                    ? `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}/page/${encodeURIComponent(editingPage.slug)}`
                    : null;
                return pageUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      View
                    </a>
                  </Button>
                ) : null;
              })()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {saveStatus === "saving" ? "Saving changes..." : saveStatus === "saved" ? "Saved" : "\u00a0"}
            </p>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Page title"
              disabled={busy}
            />
            <BlogEditor
              blogId={null}
              pageId={editingPage.page_id}
              token={token}
              content={editContent}
              onChange={setEditContent}
              placeholder="Write your page..."
            />

            {/* Advanced — slug & SEO */}
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium"
                onClick={() => setAdvancedOpen((v) => !v)}
              >
                Advanced — slug &amp; SEO
                {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {advancedOpen && (
                <div className="mt-3 space-y-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label>URL slug</Label>
                    <Input
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      placeholder="page-slug"
                      disabled={busy}
                    />
                    <p className="text-xs text-muted-foreground">
                      The URL path for this page. Must be unique. Changing it will break existing links.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta title</Label>
                    <Input
                      value={editMetaTitle}
                      onChange={(e) => { setEditMetaTitleDirty(true); setEditMetaTitle(e.target.value); }}
                      placeholder="Same as page title"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta description</Label>
                    <Input
                      value={editMetaDesc}
                      onChange={(e) => setEditMetaDesc(e.target.value)}
                      placeholder="Brief description for search engines"
                      disabled={busy}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingPageId(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => onSaveEdit(false)} disabled={busy || !editTitle.trim()}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Pages list */}
      <Card>
        <CardHeader>
          <CardTitle>Your pages</CardTitle>
          <CardDescription>{pages.length}/{limit} pages</CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="mt-2 flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dotted border-border bg-muted/25 px-6 py-10 text-center">
              <p className="text-base font-medium">No pages yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Create your first page (About, Portfolio, Services) and add it to your menu from Design.
              </p>
              <Button onClick={() => setCreating(true)} disabled={busy || pages.length >= limit}>
                Add new page
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {pages.map((p) => (
                <li key={p.page_id} className="rounded-lg border">
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => { setCreating(false); setEditingPageId(p.page_id); }}
                        disabled={busy}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => onDelete(p.page_id)}
                        disabled={busy}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
