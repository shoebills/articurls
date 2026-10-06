"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listPages, listCategories } from "@/lib/api";
import type { Category, DesignSettings, FooterColumn, FooterLink, FooterLinkType, UserPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      finalUrl = `/${formPageSlug}`;
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
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-foreground">Enable Site Footer</label>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Display footer columns and system links at the bottom of your publication.
            </p>
          </div>
          <Switch
            checked={footerEnabled}
            onCheckedChange={(checked) => onChange({ site_footer_enabled: checked })}
          />
        </div>
      </section>

      {footerEnabled ? (
        <>
          {/* Footer Columns Section */}
          <section className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground sm:text-lg">Footer Columns</h2>
              </div>
              <Button type="button" onClick={handleAddColumn} className="h-10 w-10 shrink-0 gap-1.5 p-0 sm:w-auto sm:px-4 sm:py-2">
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Column</span>
              </Button>
            </div>

            {footerColumns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
                <Columns3 className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">
                  No custom footer columns configured. Add columns below to organize your footer links.
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
                            className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate font-medium">{link.label}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditLinkDialog(col.id, link)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteLink(col.id, link.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
          </section>

          {/* Footer Description */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Footer Brand Description</h2>
            </div>
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="footer_description">Brand description</Label>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Shown under your brand name in the footer.
                </p>
              </div>
              <Textarea
                id="footer_description"
                value={settings.footer_description || ""}
                onChange={(e) => onChange({ footer_description: e.target.value })}
                placeholder="A brief summary or mission statement shown under your brand in the footer..."
                rows={2}
                className="mt-2 max-w-xl"
              />
            </div>
          </section>

          {/* Footer System Links */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Footer Links &amp; Feeds</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Sitemap Link</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Link to sitemaps</p>
                </div>
                <Switch
                  checked={settings.footer_show_sitemap !== false}
                  onCheckedChange={(checked) => onChange({ footer_show_sitemap: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">RSS Feed Link</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Link to /rss.xml</p>
                </div>
                <Switch
                  checked={settings.footer_show_rss !== false}
                  onCheckedChange={(checked) => onChange({ footer_show_rss: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Atom Feed Link</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">Link to /atom.xml</p>
                </div>
                <Switch
                  checked={settings.footer_show_atom === true}
                  onCheckedChange={(checked) => onChange({ footer_show_atom: checked })}
                />
              </div>
            </div>
          </section>

          {/* Custom Copyright */}
          <section className="space-y-4 pt-6">
            <div>
              <h2 className="text-base font-semibold text-foreground sm:text-lg">Custom Copyright</h2>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="footer_copyright">Copyright notice</Label>
              <Input
                id="footer_copyright"
                value={copyright}
                onChange={(e) => onChange({ footer_copyright: e.target.value })}
                placeholder="e.g. © 2026 Acme Inc. All rights reserved."
                className="mt-2 max-w-xl"
              />
            </div>
          </section>
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
            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link Type</label>
              <Select value={formType} onValueChange={(v) => setFormType(v as FooterLinkType)}>
                <SelectTrigger className="mt-2">
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
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Select Page</label>
                <Select
                  value={formPageSlug}
                  onValueChange={(slug) => {
                    setFormPageSlug(slug);
                    const selected = pages.find((p) => p.slug === slug);
                    if (selected && !formLabel) setFormLabel(selected.title);
                  }}
                >
                  <SelectTrigger className="mt-2">
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
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Select Category</label>
                <Select
                  value={formCatSlug}
                  onValueChange={(slug) => {
                    setFormCatSlug(slug);
                    const selected = categories.find((c) => c.slug === slug);
                    if (selected && !formLabel) setFormLabel(selected.name);
                  }}
                >
                  <SelectTrigger className="mt-2">
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

            <div className="space-y-2.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Link Label</label>
              <Input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. Terms of Service, Privacy Policy, Features"
                className="mt-2"
              />
            </div>

            {formType === "custom" ? (
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Destination URL</label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. /terms or https://acme.com"
                  className="mt-2"
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
