"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  listCategories,
  listBlogs,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryBlogs,
  setCategoryBlogs,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category, BlogListItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Check, Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";

export default function CategoriesDashboardPage() {
  const { token, isPro } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBlogs, setAllBlogs] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [catBlogIds, setCatBlogIds] = useState<number[]>([]); // blogs currently assigned
  const [pendingBlogIds, setPendingBlogIds] = useState<number[]>([]); // pending selection
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const limit = isPro ? Infinity : 3;

  const load = useCallback(async () => {
    if (!token) return;
    setErr(null);
    try {
      const [rows, blogs] = await Promise.all([listCategories(token), listBlogs(token)]);
      setCategories(rows);
      setAllBlogs(blogs);
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
        setCatBlogIds([]);
        setPendingBlogIds([]);
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
      const ids = blogs.map((b) => b.blog_id);
      setCatBlogIds(ids);
      setPendingBlogIds(ids);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load category blogs");
    } finally {
      setExpandedLoading(false);
    }
  }

  function handleExpand(catId: number) {
    if (expandedId === catId) {
      setExpandedId(null);
      setCatBlogIds([]);
      setPendingBlogIds([]);
    } else {
      setExpandedId(catId);
      loadCategoryBlogs(catId);
    }
  }

  async function onApplyBlogs() {
    if (!token || expandedId == null) return;
    setApplyBusy(true);
    setErr(null);
    try {
      const updatedCat = await setCategoryBlogs(token, expandedId, pendingBlogIds);
      setCatBlogIds(pendingBlogIds);
      // Update category blog_count locally
      setCategories((prev) =>
        prev.map((c) => (c.category_id === expandedId ? { ...c, blog_count: updatedCat.blog_count } : c))
      );
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to update category blogs");
    } finally {
      setApplyBusy(false);
    }
  }

  // Sort blogs: checked first, then unchecked, alphabetical within each group
  const sortedBlogs = useMemo(() => {
    const pending = new Set(pendingBlogIds);
    return [...allBlogs].sort((a, b) => {
      const aChecked = pending.has(a.blog_id) ? 0 : 1;
      const bChecked = pending.has(b.blog_id) ? 0 : 1;
      if (aChecked !== bChecked) return aChecked - bChecked;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [allBlogs, pendingBlogIds]);

  const hasChanges = useMemo(() => {
    if (catBlogIds.length !== pendingBlogIds.length) return true;
    const s = new Set(catBlogIds);
    return pendingBlogIds.some((id) => !s.has(id));
  }, [catBlogIds, pendingBlogIds]);

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
          <CardHeader className="pb-0">
            <CardTitle>New category</CardTitle>
            <CardDescription>Add a category to organize your blog posts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category name</Label>
              <Input
                id="new-category-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Enter category name"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreate();
                }}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCreating(false);
                  setCreateName("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={onCreate} disabled={busy || !createName.trim()}>
                Create category
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => (
            <Card
              key={cat.category_id}
              className={`overflow-hidden rounded-3xl border transition duration-200 ${
                expandedId === cat.category_id ? "border-slate-300 shadow-md" : "border-border/80 shadow-sm hover:border-slate-300 hover:shadow-md"
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="w-full sm:w-auto" onClick={onSaveEdit} disabled={busy || !editName.trim()}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-foreground">{cat.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {cat.blog_count ?? 0} {cat.blog_count === 1 ? "blog" : "blogs"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(cat.category_id);
                        }}
                        disabled={busy}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              {expandedId === cat.category_id && editingId !== cat.category_id && (
                <div className="border-t border-border/70 bg-muted/10 px-5 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Manage blogs in &ldquo;{cat.name}&rdquo;</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setExpandedId(null);
                        setCatBlogIds([]);
                        setPendingBlogIds([]);
                      }}
                    >
                      <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                      Close
                    </Button>
                  </div>
                  {expandedLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : allBlogs.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">
                      No blog posts yet. Create a post first.
                    </p>
                  ) : (
                    <>
                      <div className="max-h-72 space-y-1 overflow-y-auto">
                        {sortedBlogs.map((b) => {
                          const isChecked = pendingBlogIds.includes(b.blog_id);
                          return (
                            <button
                              key={b.blog_id}
                              type="button"
                              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted/60"
                              onClick={() => {
                                setPendingBlogIds((prev) =>
                                  isChecked
                                    ? prev.filter((id) => id !== b.blog_id)
                                    : [...prev, b.blog_id]
                                );
                              }}
                              disabled={applyBusy}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                                  isChecked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3" />}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{b.title || "Untitled"}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                        <p className="text-xs text-muted-foreground">
                          {pendingBlogIds.length} selected
                        </p>
                        <Button
                          size="sm"
                          onClick={onApplyBlogs}
                          disabled={applyBusy || !hasChanges}
                        >
                          {applyBusy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Apply
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
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
