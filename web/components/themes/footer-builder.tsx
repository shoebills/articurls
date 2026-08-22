"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listPages, listCategories } from "@/lib/api";
import type { Category, DesignSettings, FooterColumn, FooterLink, FooterLinkType, UserPage } from "@/lib/types";
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
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  FolderPlus,
  Columns3,
} from "lucide-react";

export function FooterBuilder({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const { token } = useAuth();
  const [pages, setPages] = useState<UserPage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialogs state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  // Link Form
  const [formType, setFormType] = useState<FooterLinkType>("custom");
  const [formLabel, setFormLabel] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPageSlug, setFormPageSlug] = useState("");
  const [formCatSlug, setFormCatSlug] = useState("");
  const [formNewTab, setFormNewTab] = useState(false);

  const footerEnabled = settings.site_footer_enabled !== false;
  const footerColumns = settings.footer_columns || [];
  const copyright = settings.footer_copyright || "";
  const newsletterEnabled = settings.footer_newsletter_enabled !== false;
  const systemLinksEnabled = settings.footer_system_links_enabled !== false;

  useEffect(() => {
    if (!token) return;
    Promise.all([listPages(token), listCategories(token)])
      .then(([p, c]) => {
        setPages(p);
        setCategories(c);
      })
      .catch(() => {});
  }, [token]);

  const handleAddColumn = () => {
    const newCol: FooterColumn = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: "New Column",
      links: [],
    };
    onChange({ footer_columns: [...footerColumns, newCol] });
  };

  const handleUpdateColumnTitle = (colId: string, title: string) => {
    const updated = footerColumns.map((col) =>
      col.id === colId ? { ...col, title } : col
    );
    onChange({ footer_columns: updated });
  };

  const handleDeleteColumn = (colId: string) => {
    onChange({ footer_columns: footerColumns.filter((col) => col.id !== colId) });
  };

  const openAddLinkDialog = (colId: string) => {
    setActiveColId(colId);
    setEditingLinkId(null);
    setFormType("custom");
    setFormLabel("");
    setFormUrl("");
    setFormPageSlug("");
    setFormCatSlug("");
    setFormNewTab(false);
    setLinkDialogOpen(true);
  };

  const openEditLinkDialog = (colId: string, link: FooterLink) => {
    setActiveColId(colId);
    setEditingLinkId(link.id);
    setFormType(link.type);
    setFormLabel(link.label);
    setFormUrl(link.url);
    setFormNewTab(!!link.open_in_new_tab);
    if (link.type === "page") {
      setFormPageSlug(link.url.replace(/^\/page\//, ""));
    } else if (link.type === "category") {
      setFormCatSlug(link.url.replace(/^\/category\//, ""));
    }
    setLinkDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (!activeColId) return;

    let finalUrl = formUrl.trim();
    let finalLabel = formLabel.trim();

    if (formType === "page") {
      const selected = pages.find((p) => p.slug === formPageSlug);
      finalUrl = `/page/${formPageSlug}`;
      if (!finalLabel && selected) finalLabel = selected.title;
    } else if (formType === "category") {
      const selected = categories.find((c) => c.slug === formCatSlug);
      finalUrl = `/category/${formCatSlug}`;
      if (!finalLabel && selected) finalLabel = selected.name;
    }

    if (!finalLabel || !finalUrl) return;

    const updatedCols = footerColumns.map((col) => {
      if (col.id !== activeColId) return col;

      if (editingLinkId) {
        return {
          ...col,
          links: col.links.map((l) =>
            l.id === editingLinkId
              ? { ...l, type: formType, label: finalLabel, url: finalUrl, open_in_new_tab: formNewTab }
              : l
          ),
        };
      } else {
        const newLink: FooterLink = {
          id: `flink_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: formType,
          label: finalLabel,
          url: finalUrl,
          open_in_new_tab: formNewTab,
        };
        return { ...col, links: [...col.links, newLink] };
      }
    });

    onChange({ footer_columns: updatedCols });
    setLinkDialogOpen(false);
  };

  const handleDeleteLink = (colId: string, linkId: string) => {
    const updatedCols = footerColumns.map((col) => {
      if (col.id !== colId) return col;
      return { ...col, links: col.links.filter((l) => l.id !== linkId) };
    });
    onChange({ footer_columns: updatedCols });
  };

  return (
    <div className="space-y-6">
      {/* Footer Enabled Switch */}
      <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-foreground">Enable Site Footer</label>
          <p className="text-xs text-muted-foreground">
            Display modular footer columns, newsletter subscription, and system links at the bottom of your publication.
          </p>
        </div>
        <Switch
          checked={footerEnabled}
          onCheckedChange={(checked) => onChange({ site_footer_enabled: checked })}
        />
      </div>

      {footerEnabled ? (
        <>
          {/* Modular Columns Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Modular Footer Columns</label>
                <p className="text-xs text-muted-foreground">
                  Organize your footer into structured link columns (e.g. Product, Company, Resources).
                </p>
              </div>
              <Button type="button" size="sm" onClick={handleAddColumn} className="gap-1.5 h-8">
                <FolderPlus className="h-3.5 w-3.5" />
                Add Column
              </Button>
            </div>

            {footerColumns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                <Columns3 className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  No custom footer columns configured. Published pages marked for footer will be displayed in a flat row.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddColumn}
                  className="mt-3 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Column
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {footerColumns.map((col) => (
                  <div
                    key={col.id}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-background p-4 shadow-2xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={col.title}
                          onChange={(e) => handleUpdateColumnTitle(col.id, e.target.value)}
                          className="font-semibold text-sm h-8"
                          placeholder="Column Title"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteColumn(col.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        {col.links.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate font-medium">{link.label}</span>
                              {link.open_in_new_tab && (
                                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditLinkDialog(col.id, link)}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(col.id, link.id)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openAddLinkDialog(col.id)}
                      className="mt-3 w-full gap-1 h-7 text-xs border-dashed"
                    >
                      <Plus className="h-3 w-3" />
                      Add Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Additional Footer Features */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-foreground">Footer Features & Integrations</label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Newsletter Box</p>
                  <p className="text-[11px] text-muted-foreground">Subscribe input form</p>
                </div>
                <Switch
                  checked={newsletterEnabled}
                  onCheckedChange={(checked) => onChange({ footer_newsletter_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">System Links</p>
                  <p className="text-[11px] text-muted-foreground">RSS Feed & Sitemap</p>
                </div>
                <Switch
                  checked={systemLinksEnabled}
                  onCheckedChange={(checked) => onChange({ footer_system_links_enabled: checked })}
                />
              </div>
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Custom Copyright */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custom Copyright / Tagline Text</label>
            <Input
              value={copyright}
              onChange={(e) => onChange({ footer_copyright: e.target.value })}
              placeholder="e.g. © 2026 Acme Inc. All rights reserved."
            />
            <p className="text-xs text-muted-foreground">
              Optional custom copyright or legal notice rendered at the very bottom of the page.
            </p>
          </div>
        </>
      ) : null}

      {/* Add / Edit Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingLinkId ? "Edit Footer Link" : "Add Footer Link"}</DialogTitle>
            <DialogDescription>
              Choose destination page or enter a custom URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link Type</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as FooterLinkType)}>
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
                        {p.title} (/page/{p.slug})
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
                placeholder="e.g. Terms of Service, Privacy Policy, Features"
              />
            </div>

            {formType === "custom" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Destination URL</label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. /terms or https://acme.com"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Open in New Tab</p>
                <p className="text-xs text-muted-foreground">Adds target=&quot;_blank&quot; attribute</p>
              </div>
              <Switch checked={formNewTab} onCheckedChange={setFormNewTab} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveLink}>
              {editingLinkId ? "Save Link" : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
