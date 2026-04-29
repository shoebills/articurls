"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryBlogs,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category, BlogListItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";

export default function CategoriesDashboardPage() {
  const { token, isPro } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedBlogs, setExpandedBlogs] = useState<BlogListItem[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const limit = isPro ? Infinity : 3;

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const rows = await listCategories(token);
      setCategories(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate() {
    if (!token) return;
    if (!createName.trim()) {
      setErr("Category name is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await createCategory(token, { name: createName.trim() });
      setCreateName("");
      setCreating(false);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit() {
    if (!token || editingId == null) return;
    if (!editName.trim()) {
      setErr("Category name is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updateCategory(token, editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to update category");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!token || deleteId == null) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteCategory(token, deleteId);
      setDeleteId(null);
      if (expandedId === deleteId) {
        setExpandedId(null);
        setExpandedBlogs([]);
      }
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete category");
    } finally {
      setBusy(false);
    }
  }

  async function loadCategoryBlogs(catId: number) {
    if (!token) return;
    setExpandedLoading(true);
    try {
      const blogs = await getCategoryBlogs(token, catId);
      setExpandedBlogs(blogs);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load category blogs");
    } finally {
      setExpandedLoading(false);
    }
  }

  function handleExpand(catId: number) {
    if (expandedId === catId) {
      setExpandedId(null);
      setExpandedBlogs([]);
    } else {
      setExpandedId(catId);
      loadCategoryBlogs(catId);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading categories…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:block">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 touch-manipulation bg-slate-900 text-white hover:bg-slate-800 sm:hidden"
            onClick={() => {
              setEditingId(null);
              setCreating(true);
            }}
            disabled={busy || categories.length >= limit}
            aria-label="Create new category"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <Button
          className="hidden sm:inline-flex"
          onClick={() => {
            setEditingId(null);
            setCreating(true);
          }}
          disabled={busy || categories.length >= limit}
        >
          Create new
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Organize your blogs into categories. {isPro ? "Unlimited" : `${categories.length}/${limit}`} categories{isPro ? "" : " on free plan"}.
      </p>

      {creating && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Category name"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreate();
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreating(false);
                  setCreateName("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={busy || !createName.trim()}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categories.length === 0 && !creating ? (
        <div
          className="mt-10 flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-14 text-center transition-colors duration-200 sm:min-h-[260px]"
          role="status"
          aria-label="No categories yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/60">
            <Tag className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium text-foreground">No categories yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create categories to organize your blog posts and help readers browse by topic.
            </p>
          </div>
          <Button
            onClick={() => setCreating(true)}
            disabled={busy || categories.length >= limit}
          >
            Create new
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.category_id}>
              <Card
                className={`cursor-pointer rounded-xl border transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-sm ${
                  expandedId === cat.category_id ? "border-slate-300 shadow-sm" : "border-[#e5e7eb]"
                }`}
                onClick={() => {
                  if (editingId !== cat.category_id) handleExpand(cat.category_id);
                }}
              >
                <CardContent className="p-5">
                  {editingId === cat.category_id ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={busy}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSaveEdit();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditName("");
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                          }}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={onSaveEdit} disabled={busy || !editName.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-slate-900">{cat.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {cat.blog_count} {cat.blog_count === 1 ? "blog" : "blogs"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingId(cat.category_id);
                            setEditName(cat.name);
                          }}
                          disabled={busy}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(cat.category_id)}
                          disabled={busy}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {expandedId === cat.category_id && editingId !== cat.category_id && (
                <div className="mt-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Blogs in "{cat.name}"</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setExpandedId(null);
                        setExpandedBlogs([]);
                      }}
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Close
                    </Button>
                  </div>
                  {expandedLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : expandedBlogs.length === 0 ? (
                    <p className="py-3 text-center text-sm text-muted-foreground">
                      No blogs in this category yet. Assign blogs from the post editor.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {expandedBlogs.map((b) => (
                        <li key={b.blog_id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                          <span className="truncate">{b.title || "Untitled"}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize">{b.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              The category will be removed and all blogs will be unlinked from it. No blogs will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
