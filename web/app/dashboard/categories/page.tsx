"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const limit = isPro ? Infinity : 3;

  /* ── Close dropdown helper ── */
  const closeDropdown = useCallback(() => {
    setExpandedId(null);
    setCatBlogIds([]);
    setPendingBlogIds([]);
  }, []);

  /* ── Click-outside & scroll & escape dismissal ── */
  useEffect(() => {
    if (expandedId == null) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      closeDropdown();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeDropdown();
    }

    // Use capture for scroll so we catch scrolls on any ancestor
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedId, closeDropdown]);

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
      if (expandedId === deleteId) closeDropdown();
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
      closeDropdown();
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
      closeDropdown();
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
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const isExpanded = expandedId === cat.category_id;
            const isEditing = editingId === cat.category_id;
            const count = cat.blog_count ?? 0;

            return (
              /* Relative wrapper so the floating dropdown positions against the card */
              <div key={cat.category_id} ref={isExpanded ? dropdownRef : undefined} className="relative">
                <Card
                  className={`group cursor-pointer overflow-hidden rounded-xl border bg-white transition-[box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isExpanded
                      ? "border-slate-300 shadow-md"
                      : "border-[#e5e7eb] shadow-sm hover:border-slate-300 hover:shadow-md"
                  }`}
                  tabIndex={0}
                  onClick={() => {
                    if (!isEditing) handleExpand(cat.category_id);
                  }}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleExpand(cat.category_id);
                    }
                  }}
                >
                  <CardContent className="p-0 sm:p-0">
                    {isEditing ? (
                      /* ── Inline edit form ── */
                      <div className="space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
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
                      /* ── Category display ── */
                      <div className="relative flex items-center gap-3.5 p-4 sm:p-5">
                        {/* Icon accent */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-slate-200/80 group-hover:text-slate-600">
                          <Tag className="h-4 w-4" aria-hidden />
                        </div>

                        {/* Title + metadata */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
                            {cat.name}
                          </p>
                          <p className="mt-1 text-sm leading-none text-slate-500">
                            {count} {count === 1 ? "blog" : "blogs"}
                          </p>
                        </div>

                        {/* Action icons — top-right */}
                        <div
                          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(cat.category_id);
                              setEditName(cat.name);
                            }}
                            disabled={busy}
                            aria-label={`Edit ${cat.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(cat.category_id);
                            }}
                            disabled={busy}
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Floating blog assignment dropdown ── */}
                {isExpanded && !isEditing && (
                  <div

                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">
                        Manage blogs in &ldquo;{cat.name}&rdquo;
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-700"
                        onClick={closeDropdown}
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Close
                      </Button>
                    </div>

                    {expandedLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : allBlogs.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        No blog posts yet. Create a post first.
                      </p>
                    ) : (
                      <>
                        {/* 5 visible rows × 36px = 180px */}
                        <div className="max-h-[180px] overflow-y-auto px-1.5 py-1.5">
                          {sortedBlogs.map((b) => {
                            const isChecked = pendingBlogIds.includes(b.blog_id);
                            return (
                              <button
                                key={b.blog_id}
                                type="button"
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                                  isChecked
                                    ? "bg-slate-100/80 text-slate-900"
                                    : "text-slate-600 hover:bg-slate-100/60"
                                }`}
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
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                                    isChecked
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {isChecked && <Check className="h-3 w-3" />}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{b.title || "Untitled"}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
                          <p className="text-xs text-slate-400">
                            {pendingBlogIds.length} selected
                          </p>
                          <Button
                            size="sm"
                            className="h-8"
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
              </div>
            );
          })}
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

