"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateMenuCategories,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown, ChevronUp, Pencil, Trash2, X } from "lucide-react";

export default function CategoriesDashboardPage() {
  const { token } = useAuth();

  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? (getCachedApiData<Category[]>("/categories/", t) ?? []) : [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !apiCacheHas("/categories/", t);
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [catCreateName, setCatCreateName] = useState("");
  const [catEditingId, setCatEditingId] = useState<number | null>(null);
  const [catEditingName, setCatEditingName] = useState("");
  const [catDeletingId, setCatDeletingId] = useState<number | null>(null);

  const [menuCatSelection, setMenuCatSelection] = useState<number[]>([]);
  const [catToAdd, setCatToAdd] = useState<string>("");

  const catsById = useMemo(() => new Map(categories.map((c) => [c.category_id, c])), [categories]);
  const availableCats = categories.filter((c) => !menuCatSelection.includes(c.category_id));

  function getNextCatToAdd(rows: Category[], selection: number[]) {
    const nextAvailable = rows.find((cat) => !selection.includes(cat.category_id));
    return nextAvailable ? String(nextAvailable.category_id) : "";
  }

  function showSavedToast() {
    setSavedMsg("Saved");
  }

  async function load() {
    if (!token) return;
    try {
      const c = await listCategories(token);
      setCategories(c);
      const selectedCats = [...c]
        .filter((x) => x.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 9999) - (b.menu_order ?? 9999))
        .map((x) => x.category_id);
      setMenuCatSelection(selectedCats);
      setCatToAdd(getNextCatToAdd(c, selectedCats));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreateCategory() {
    if (!token || !catCreateName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createCategory(token, { name: catCreateName.trim() });
      setCatCreateName("");
      const rows = await listCategories(token);
      setCategories(rows);
      setCatToAdd(getNextCatToAdd(rows, menuCatSelection));
      showSavedToast();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveRename() {
    if (!token || catEditingId == null || !catEditingName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await updateCategory(token, catEditingId, { name: catEditingName.trim() });
      setCatEditingId(null);
      setCatEditingName("");
      const rows = await listCategories(token);
      setCategories(rows);
      setCatToAdd(getNextCatToAdd(rows, menuCatSelection));
      showSavedToast();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to rename category");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteCategory(id: number) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    let nextSelection = menuCatSelection;
    try {
      await deleteCategory(token, id);
      if (menuCatSelection.includes(id)) {
        nextSelection = menuCatSelection.filter((x) => x !== id);
        await updateMenuCategories(token, nextSelection);
        setMenuCatSelection(nextSelection);
      }
      const rows = await listCategories(token);
      setCategories(rows);
      setCatToAdd(getNextCatToAdd(rows, nextSelection));
      setCatDeletingId(null);
      showSavedToast();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete category");
    } finally {
      setBusy(false);
    }
  }

  async function saveMenu(nextSelection: number[]) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = await updateMenuCategories(token, nextSelection);
      setCategories(rows);
      setMenuCatSelection(nextSelection);
      setCatToAdd(getNextCatToAdd(rows, nextSelection));
      showSavedToast();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save menu");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>
        <div className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
          <div className="p-5 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-4 w-64" />
          </div>
          <div className="p-5 sm:p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>

      <section className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold leading-none tracking-tight">Create Category</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add a new category to organize your posts.</p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New category name"
              value={catCreateName}
              onChange={(e) => setCatCreateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onCreateCategory(); }}
              disabled={busy}
            />
            <Button onClick={onCreateCategory} disabled={busy || !catCreateName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold leading-none tracking-tight">All Categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">Rename or delete existing categories.</p>
        </div>
        <div className="p-5 sm:p-6 space-y-2">
          {categories.length === 0 ? (
            <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">No categories yet.</p>
            </div>
          ) : (
            categories.map((cat) => {
              const inMenu = menuCatSelection.includes(cat.category_id);
              const isEditing = catEditingId === cat.category_id;
              const isDeleting = catDeletingId === cat.category_id;
              return (
                <div key={cat.category_id} className="rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <Input
                          value={catEditingName}
                          onChange={(e) => setCatEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onSaveRename();
                            if (e.key === "Escape") { setCatEditingId(null); setCatEditingName(""); }
                          }}
                          autoFocus
                          disabled={busy}
                        />
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" className="h-10" onClick={onSaveRename} disabled={busy || !catEditingName.trim()}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-10" onClick={() => { setCatEditingId(null); setCatEditingName(""); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : isDeleting ? (
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">{cat.name}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" variant="outline" className="h-10" onClick={() => setCatDeletingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="destructive" className="h-10" onClick={() => onDeleteCategory(catDeletingId!)} disabled={busy}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="truncate text-sm font-medium">{cat.name}</span>
                        {inMenu ? (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            In menu
                          </span>
                        ) : null}
                        <div className="flex shrink-0 items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8"
                            onClick={() => { setCatEditingId(cat.category_id); setCatEditingName(cat.name); }}
                            disabled={busy}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setCatDeletingId(cat.category_id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {!isEditing ? (
                      <p className="text-xs text-muted-foreground">
                        {cat.blog_count ?? 0} {cat.blog_count === 1 ? "post" : "posts"}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-semibold leading-none tracking-tight">Menu Order</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which categories appear in your blog header and in what order.
          </p>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          {menuCatSelection.length === 0 ? (
            <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {categories.length === 0 ? "No categories yet." : "Add categories to display in the menu."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {menuCatSelection.map((id, idx) => {
                const cat = catsById.get(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0">
                    <span className="truncate min-w-0">{cat?.name || "Untitled"}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" disabled={busy || idx === 0}
                        onClick={() => {
                          const next = [...menuCatSelection];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          saveMenu(next);
                        }}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={busy || idx === menuCatSelection.length - 1}
                        onClick={() => {
                          const next = [...menuCatSelection];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          saveMenu(next);
                        }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={busy}
                        onClick={() => saveMenu(menuCatSelection.filter((x) => x !== id))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {availableCats.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={catToAdd} onValueChange={setCatToAdd}>
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Add category to menu" />
                </SelectTrigger>
                <SelectContent>
                  {availableCats.map((c) => (
                    <SelectItem key={c.category_id} value={String(c.category_id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="default" disabled={busy || !catToAdd}
                onClick={() => {
                  const id = Number(catToAdd);
                  if (!Number.isFinite(id)) return;
                  saveMenu([...menuCatSelection, id]);
                }}
              >
                Add category
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <FloatingErrorToast message={savedMsg} onDismiss={() => setSavedMsg(null)} autoDismissMs={3000} variant="success" />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
