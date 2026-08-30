"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listPages, listCategories } from "@/lib/api";
import type { Category, DesignSettings, NavItem, NavItemType, UserPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  PanelTop,
  AppWindow,
  Minus,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function SortableNavItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: NavItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-2xs transition-all ${
        isDragging ? "border-primary/50 shadow-md ring-2 ring-primary/20" : "border-border/70"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Reorder link"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate text-foreground">{item.label}</span>
            {item.is_cta ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                CTA Button
              </span>
            ) : null}
            {item.open_in_new_tab ? (
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{item.url}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NavBuilder({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const { token } = useAuth();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formType, setFormType] = useState<NavItemType>("custom");
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPageSlug, setFormPageSlug] = useState("");
  const [formCatSlug, setFormCatSlug] = useState("");
  const [formIsCta, setFormIsCta] = useState(false);
  const [formNewTab, setFormNewTab] = useState(false);

  const align = settings.navbar_alignment || "left";
  const style = settings.navbar_style || "bordered";
  const navItems = settings.nav_items || [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    if (!token) return;
    Promise.all([listPages(token), listCategories(token)])
      .then(([p, c]) => {
        setPages(p);
        setCategories(c);
      })
      .catch(() => {});
  }, [token]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = navItems.findIndex((i) => i.id === active.id);
    const newIndex = navItems.findIndex((i) => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(navItems, oldIndex, newIndex);
      onChange({ nav_items: reordered });
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormType("custom");
    setFormLabel("");
    setFormUrl("");
    setFormPageSlug("");
    setFormCatSlug("");
    setFormIsCta(false);
    setFormNewTab(false);
    setDialogOpen(true);
  };

  const openEditDialog = (item: NavItem) => {
    setEditingId(item.id);
    setFormType(item.type);
    setFormLabel(item.label);
    setFormUrl(item.url);
    setFormIsCta(!!item.is_cta);
    setFormNewTab(!!item.open_in_new_tab);
    if (item.type === "page") {
      const slug = item.url.replace(/^\/page\//, "");
      setFormPageSlug(slug);
    } else if (item.type === "category") {
      const slug = item.url.replace(/^\/category\//, "");
      setFormCatSlug(slug);
    }
    setDialogOpen(true);
  };

  const handleSaveItem = () => {
    let finalUrl = formUrl.trim();
    let finalLabel = formLabel.trim();

    if (formType === "page") {
      const selected = pages.find((p) => p.slug === formPageSlug);
      finalUrl = `/${formPageSlug}`;
      if (!finalLabel && selected) finalLabel = selected.title;
    } else if (formType === "category") {
      const selected = categories.find((c) => c.slug === formCatSlug);
      finalUrl = `/category/${formCatSlug}`;
      if (!finalLabel && selected) finalLabel = selected.name;
    }

    if (!finalLabel || !finalUrl) return;

    if (editingId) {
      const updated = navItems.map((item) =>
        item.id === editingId
          ? {
              ...item,
              type: formType,
              label: finalLabel,
              url: finalUrl,
              is_cta: formIsCta,
              open_in_new_tab: formNewTab,
            }
          : item
      );
      onChange({ nav_items: updated });
    } else {
      const newItem: NavItem = {
        id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: formType,
        label: finalLabel,
        url: finalUrl,
        is_cta: formIsCta,
        open_in_new_tab: formNewTab,
      };
      onChange({ nav_items: [...navItems, newItem] });
    }

    setDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    onChange({ nav_items: navItems.filter((i) => i.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Brand Identity / Title */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Header Brand Name</label>
          <Input
            value={settings.nav_blog_name || ""}
            onChange={(e) => onChange({ nav_blog_name: e.target.value })}
            placeholder="e.g. My Publication"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Brand Font Size</label>
          <div className="flex gap-2">
            {(
              [
                { id: "small", label: "Small" },
                { id: "medium", label: "Medium" },
                { id: "large", label: "Large" },
              ] as const
            ).map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => onChange({ nav_blog_name_size: s.id })}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                  (settings.nav_blog_name_size || "medium") === s.id
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Alignment & Style */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Header Alignment</label>
          <div className="flex gap-2">
            {(
              [
                { id: "left", icon: AlignLeft, label: "Left" },
                { id: "center", icon: AlignCenter, label: "Center" },
                { id: "right", icon: AlignRight, label: "Right" },
              ] as const
            ).map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => onChange({ navbar_alignment: a.id })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  align === a.id
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <a.icon className="h-3.5 w-3.5" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Header Style</label>
          <div className="flex gap-2">
            {(
              [
                { id: "bordered", icon: PanelTop, label: "Bordered" },
                { id: "floating", icon: AppWindow, label: "Floating" },
                { id: "minimal", icon: Minus, label: "Minimal" },
              ] as const
            ).map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => onChange({ navbar_style: s.id })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                  style === s.id
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                    : "border-border/70 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-border/60" />

      {/* Navigation Links List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-foreground">Custom Navigation Links</label>
            <p className="text-xs text-muted-foreground">
              Define the links, custom pages, and CTA buttons shown in your site navigation.
            </p>
          </div>
          <Button type="button" size="sm" onClick={openAddDialog} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" />
            Add Link
          </Button>
        </div>

        {navItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              No custom navigation links configured. Your blog categories will be displayed automatically.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddDialog}
              className="mt-3 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Nav Link
            </Button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <SortableNavItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => openEditDialog(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Navigation Link" : "Add Navigation Link"}</DialogTitle>
            <DialogDescription>
              Configure the link type, target destination, and visual style.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link Type</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as NavItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom URL</SelectItem>
                  <SelectItem value="page">Internal Custom Page</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formType === "page" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Select Page</label>
                <Select
                  value={formPageSlug}
                  onValueChange={(slug) => {
                    setFormPageSlug(slug);
                    const selected = pages.find((p) => p.slug === slug);
                    if (selected && !formLabel) setFormLabel(selected.title);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a published page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => (
                      <SelectItem key={p.page_id} value={p.slug}>
                        {p.title} (/{p.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {formType === "category" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Select Category</label>
                <Select
                  value={formCatSlug}
                  onValueChange={(slug) => {
                    setFormCatSlug(slug);
                    const selected = categories.find((c) => c.slug === slug);
                    if (selected && !formLabel) setFormLabel(selected.name);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.category_id} value={c.slug}>
                        {c.name} (/category/{c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link Label</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Features, Pricing, Docs"
              />
            </div>

            {formType === "custom" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Destination URL</label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. /pricing or https://acme.com"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Highlight as CTA Button</p>
                <p className="text-xs text-muted-foreground">Renders as a styled primary action button</p>
              </div>
              <Switch checked={formIsCta} onCheckedChange={setFormIsCta} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Open in New Tab</p>
                <p className="text-xs text-muted-foreground">Adds target=&quot;_blank&quot; attribute</p>
              </div>
              <Switch checked={formNewTab} onCheckedChange={setFormNewTab} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveItem}>
              {editingId ? "Save Changes" : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
