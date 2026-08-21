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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";

function SortableNavItem({
  id,
  name,
  disabled,
}: {
  id: number;
  name: string;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border px-3 py-2"
    >
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="flex cursor-grab touch-none items-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="truncate text-sm">{name}</span>
    </div>
  );
}

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

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [menuOpenCatId, setMenuOpenCatId] = useState<number | null>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const menuCategories = useMemo(
    () =>
      categories
        .filter((c) => c.show_in_menu)
        .sort(
          (a, b) => (a.menu_order ?? 999) - (b.menu_order ?? 999),
        ),
    [categories],
  );

  const menuCategoryIds = useMemo(
    () => menuCategories.map((c) => c.category_id),
    [menuCategories],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  async function load() {
    if (!token) return;
    try {
      const c = await listCategories(token);
      setCategories(c);
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

  useEffect(() => {
    if (!createDialogOpen) setCreateName("");
  }, [createDialogOpen]);

  async function handleCreate() {
    if (!token || !createName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createCategory(token, { name: createName.trim() });
      setCreateDialogOpen(false);
      const rows = await listCategories(token);
      setCategories(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create category");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename() {
    if (!token || renameId == null || !renameName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await updateCategory(token, renameId, { name: renameName.trim() });
      setRenameDialogOpen(false);
      setRenameId(null);
      setRenameName("");
      const rows = await listCategories(token);
      setCategories(rows);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to rename category");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!token || deleteId === null) return;
    setBusy(true);
    setErr(null);
    try {
      const wasInNav = categories.some(
        (c) => c.category_id === deleteId && c.show_in_menu,
      );

      await deleteCategory(token, deleteId);

      if (wasInNav) {
        const orderedIds = menuCategories
          .filter((c) => c.category_id !== deleteId)
          .map((c) => c.category_id);
        await updateMenuCategories(token, orderedIds);
      }

      const rows = await listCategories(token);
      setCategories(rows);
      setDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete category");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleNav(cat: Category) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const nextOrder = cat.show_in_menu
        ? menuCategories
            .filter((c) => c.category_id !== cat.category_id)
            .map((c) => c.category_id)
        : [...menuCategoryIds, cat.category_id];

      const rows = await updateMenuCategories(token, nextOrder);
      setCategories(rows);
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Failed to update navigation",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!token) return;

    const oldIndex = menuCategoryIds.indexOf(active.id as number);
    const newIndex = menuCategoryIds.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(menuCategoryIds, oldIndex, newIndex);

    setCategories((prev) =>
      prev.map((c) => {
        const idx = newOrder.indexOf(c.category_id);
        if (idx !== -1) {
          return { ...c, show_in_menu: true, menu_order: idx };
        }
        return c;
      }),
    );

    setBusy(true);
    setErr(null);
    try {
      const rows = await updateMenuCategories(token, newOrder);
      setCategories(rows);
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message : "Failed to reorder navigation",
      );
      const rows = await listCategories(token);
      setCategories(rows);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center justify-between gap-3 sm:block">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Categories
            </h1>
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90 sm:hidden"
              aria-label="Create new category"
              onClick={() => setCreateDialogOpen(true)}
              disabled={busy}
            >
              <span className="text-xl leading-none">+</span>
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Categories are flexible topics used to organize, filter, and discover posts.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={busy}
          className="hidden h-11 shrink-0 touch-manipulation gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
        >
          <Plus className="h-4 w-4" />
          New category
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div
          className="flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-border bg-background px-6 py-14 text-center"
          role="status"
          aria-label="No categories yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60">
            <Tags className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-base font-medium text-foreground">No categories yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first category to organize your posts.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCategories.map((cat) => (
            <div
              key={cat.category_id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0"
            >
              <span className="truncate text-sm font-medium min-w-0">
                {cat.name}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {cat.blog_count ?? 0}{" "}
                  {cat.blog_count === 1 ? "post" : "posts"}
                </span>
                <DropdownMenu
                open={menuOpenCatId === cat.category_id}
                onOpenChange={(open) => {
                  if (!open) setMenuOpenCatId(null);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Actions for ${cat.name}`}
                    disabled={busy}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => setMenuOpenCatId(cat.category_id)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameId(cat.category_id);
                      setRenameName(cat.name);
                      setRenameDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleNav(cat)}
                    disabled={busy}
                  >
                    {cat.show_in_menu ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {cat.show_in_menu
                      ? "Remove from Menu"
                      : "Show in Menu"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => {
                      setDeleteId(cat.category_id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            </div>
          ))}
        </div>
      )}

      {categories.length > 0 && <hr className="border-border/80" />}

      {categories.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              Navigation
            </h2>
            <p className="text-sm text-muted-foreground">
              These categories appear in your blog header.
            </p>
          </div>
          {menuCategories.length === 0 ? (
            <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No categories in navigation. Use the{" "}
                <span className="inline-flex items-center align-middle">
                  <MoreVertical className="h-3.5 w-3.5" />
                </span>{" "}
                menu to add categories to your blog header.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={menuCategoryIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {menuCategories.map((cat) => (
                    <SortableNavItem
                      key={cat.category_id}
                      id={cat.category_id}
                      name={cat.name}
                      disabled={busy}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <Dialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            autoFocus
            disabled={busy}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={busy || !createName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            autoFocus
            disabled={busy}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false);
                setRenameId(null);
                setRenameName("");
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={busy || !renameName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              Posts assigned to this category will simply lose this
              category. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteId(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingErrorToast
        message={err}
        onDismiss={() => setErr(null)}
      />
    </div>
  );
}
