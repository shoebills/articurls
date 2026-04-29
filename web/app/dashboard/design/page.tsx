"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getDesignSettings,
  listPages,
  listBlogs,
  patchDesignSettings,
  updateMenuPages,
  updateFooterPages,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, UserPage, BlogListItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";

export default function DesignDashboardPage() {
  const { token } = useAuth();
  const [design, setDesign] = useState<DesignSettings>({
    navbar_enabled: false,
    nav_blog_name: null,
    nav_menu_enabled: false,
    footer_enabled: false,
    site_footer_enabled: false,
    featured_blogs_enabled: false,
    featured_blog_ids: [],
  });
  const [pages, setPages] = useState<UserPage[]>([]);
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [menuSelection, setMenuSelection] = useState<number[]>([]);
  const [pageToAdd, setPageToAdd] = useState<string>("");
  const [footerSelection, setFooterSelection] = useState<number[]>([]);
  const [footerPageToAdd, setFooterPageToAdd] = useState<string>("");
  const [blogToAdd, setBlogToAdd] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pagesById = useMemo(() => new Map(pages.map((p) => [p.page_id, p])), [pages]);

  async function load() {
    if (!token) return;
    try {
      const [d, p, b] = await Promise.all([getDesignSettings(token), listPages(token), listBlogs(token)]);
      setDesign({
        ...d,
        featured_blog_ids: d.featured_blog_ids || [],
      });
      setPages(p);
      setBlogs(b.filter((x) => x.status === "published"));
      const selected = [...p]
        .filter((x) => x.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 9999) - (b.menu_order ?? 9999))
        .map((x) => x.page_id);
      setMenuSelection(selected);
      const firstAvailable = p.find((x) => !selected.includes(x.page_id));
      setPageToAdd(firstAvailable ? String(firstAvailable.page_id) : "");
      const selectedFooter = [...p]
        .filter((x) => x.show_in_footer)
        .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999))
        .map((x) => x.page_id);
      setFooterSelection(selectedFooter);
      const firstFooterAvailable = p.find((x) => !selectedFooter.includes(x.page_id));
      setFooterPageToAdd(firstFooterAvailable ? String(firstFooterAvailable.page_id) : "");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load design settings");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function saveDesign(next: DesignSettings) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const d = await patchDesignSettings(token, next);
      setDesign(d);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save design");
    } finally {
      setBusy(false);
    }
  }

  async function saveMenu(nextSelection: number[]) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = await updateMenuPages(token, nextSelection);
      setPages(rows);
      setMenuSelection(nextSelection);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save menu");
    } finally {
      setBusy(false);
    }
  }

  async function saveFooter(nextSelection: number[]) {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const rows = await updateFooterPages(token, nextSelection);
      setPages(rows);
      setFooterSelection(nextSelection);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save footer links");
    } finally {
      setBusy(false);
    }
  }

  const available = pages.filter((p) => !menuSelection.includes(p.page_id));
  const footerAvailable = pages.filter((p) => !footerSelection.includes(p.page_id));
  const selectedMenuPages = menuSelection
    .map((id) => pagesById.get(id))
    .filter((p): p is UserPage => Boolean(p));
  const selectedFooterPages = footerSelection
    .map((id) => pagesById.get(id))
    .filter((p): p is UserPage => Boolean(p));
  const previewBlogName = (design.nav_blog_name || "").trim() || "My Blog";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Design</h1>
      <Card>
        <CardHeader>
          <CardTitle>Navigation bar</CardTitle>
          <CardDescription>Control public navigation for your profile/blog.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Enable navbar</p>
              <p className="text-sm text-muted-foreground">If disabled, public view shows only blogs.</p>
            </div>
            <Switch
              checked={design.navbar_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, navbar_enabled: v })}
              disabled={busy}
            />
          </div>

          {design.navbar_enabled ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="blogName">Blog name</Label>
                <Input
                  id="blogName"
                  value={design.nav_blog_name || ""}
                  onChange={(e) => setDesign((prev) => ({ ...prev, nav_blog_name: e.target.value }))}
                  onBlur={() =>
                    saveDesign({
                      ...design,
                      nav_blog_name: (design.nav_blog_name || "").trim() || null,
                    })
                  }
                  placeholder="My Blog"
                  disabled={busy}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Enable menu</p>
                  <p className="text-sm text-muted-foreground">Show custom pages in navbar.</p>
                </div>
                <Switch
                  checked={design.nav_menu_enabled}
                  onCheckedChange={(v) => saveDesign({ ...design, nav_menu_enabled: v })}
                  disabled={busy}
                />
              </div>
              {design.nav_menu_enabled ? (
                <div className="space-y-3 rounded-lg border p-3">
                  {pages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Add pages to display.</p>
                  ) : (
                    <>
                      {menuSelection.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Add pages to display.</p>
                      ) : (
                        <ul className="space-y-2">
                          {menuSelection.map((id, idx) => (
                            <li key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <span>{pagesById.get(id)?.title || "Untitled"}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={busy || idx === 0}
                                  onClick={() => {
                                    const next = [...menuSelection];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    saveMenu(next);
                                  }}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={busy || idx === menuSelection.length - 1}
                                  onClick={() => {
                                    const next = [...menuSelection];
                                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                    saveMenu(next);
                                  }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={busy}
                                  onClick={() => saveMenu(menuSelection.filter((x) => x !== id))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {available.length > 0 ? (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Select value={pageToAdd} onValueChange={setPageToAdd}>
                            <SelectTrigger className="sm:max-w-xs">
                              <SelectValue placeholder="Add page to menu" />
                            </SelectTrigger>
                            <SelectContent>
                              {available.map((p) => (
                                <SelectItem key={p.page_id} value={String(p.page_id)}>
                                  {p.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            disabled={busy || !pageToAdd}
                            onClick={() => {
                              const id = Number(pageToAdd);
                              if (!Number.isFinite(id)) return;
                              const next = [...menuSelection, id];
                              saveMenu(next);
                              const nextAvailable = available.find((p) => p.page_id !== id);
                              setPageToAdd(nextAvailable ? String(nextAvailable.page_id) : "");
                            }}
                          >
                            Add page
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-3 border-t border-border/70 pt-4">
            <p className="text-sm font-medium">Live preview of navbar</p>
            <div className="rounded-xl border bg-muted/20 p-3 sm:hidden">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Mobile preview</p>
              {design.navbar_enabled ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                    <span className="truncate text-lg font-semibold">{previewBlogName}</span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                      <Menu className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="rounded-md border bg-background p-2">
                    {design.nav_menu_enabled ? (
                      selectedMenuPages.length > 0 ? (
                        <div className="space-y-1">
                          {selectedMenuPages.map((p) => (
                            <p key={p.page_id} className="rounded px-2 py-1 text-sm hover:bg-muted">
                              {p.title}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-1 text-sm text-muted-foreground">Add pages to display.</p>
                      )
                    ) : null}
                    <div className="mt-2 border-t pt-2">
                      <Button size="sm" className="w-full">
                        Subscribe
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Blogs only (navbar disabled).</p>
              )}
            </div>

            <div className="hidden rounded-xl border bg-muted/20 p-4 sm:block">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Desktop preview</p>
              {design.navbar_enabled ? (
                <div className="rounded-md border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="truncate text-lg font-semibold">{previewBlogName}</span>
                    <div className="flex min-w-0 items-center gap-4">
                      {design.nav_menu_enabled ? (
                        selectedMenuPages.length > 0 ? (
                          <div className="flex min-w-0 items-center gap-3">
                            {selectedMenuPages.map((p) => (
                              <span key={p.page_id} className="truncate text-sm text-muted-foreground">
                                {p.title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Add pages to display.</span>
                        )
                      ) : null}
                      <Button size="sm">Subscribe</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Blogs only (navbar disabled).</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured blogs</CardTitle>
          <CardDescription>Pin up to 10 published blogs to the top of your public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Enable featured blogs</p>
              <p className="text-sm text-muted-foreground">Show a featured section below the search bar.</p>
            </div>
            <Switch
              checked={design.featured_blogs_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, featured_blogs_enabled: v })}
              disabled={busy}
            />
          </div>
          {design.featured_blogs_enabled ? (
            <div className="space-y-3 rounded-lg border p-3">
              {design.featured_blog_ids.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add blogs to display.</p>
              ) : (
                <ul className="space-y-2">
                  {design.featured_blog_ids.map((id, idx) => {
                    const b = blogs.find((x) => x.blog_id === id);
                    return (
                      <li key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="truncate">{b?.title || "Unknown blog"}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || idx === 0}
                            onClick={() => {
                              const next = [...design.featured_blog_ids];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              saveDesign({ ...design, featured_blog_ids: next });
                            }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || idx === design.featured_blog_ids.length - 1}
                            onClick={() => {
                              const next = [...design.featured_blog_ids];
                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                              saveDesign({ ...design, featured_blog_ids: next });
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => saveDesign({ ...design, featured_blog_ids: design.featured_blog_ids.filter((x) => x !== id) })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {blogs.filter((b) => !design.featured_blog_ids.includes(b.blog_id)).length > 0 && design.featured_blog_ids.length < 10 ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={blogToAdd} onValueChange={setBlogToAdd}>
                    <SelectTrigger className="sm:max-w-xs">
                      <SelectValue placeholder="Add blog to featured" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogs
                        .filter((b) => !design.featured_blog_ids.includes(b.blog_id))
                        .map((b) => (
                          <SelectItem key={b.blog_id} value={String(b.blog_id)}>
                            {b.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={busy || !blogToAdd}
                    onClick={() => {
                      const id = Number(blogToAdd);
                      if (!Number.isFinite(id)) return;
                      const next = [...design.featured_blog_ids, id];
                      saveDesign({ ...design, featured_blog_ids: next });
                      setBlogToAdd("");
                    }}
                  >
                    Add blog
                  </Button>
                </div>
              ) : design.featured_blog_ids.length >= 10 ? (
                <p className="text-sm text-muted-foreground mt-2">Maximum 10 blogs allowed.</p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
          <CardDescription>Control About section under blogs and site footer content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Enable about section under blogs</p>
              <p className="text-sm text-muted-foreground">
                Displays profile image, name, bio, link, and socials below blog pages.
              </p>
            </div>
            <Switch
              checked={design.footer_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, footer_enabled: v })}
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Enable footer</p>
              <p className="text-sm text-muted-foreground">
                Shows selected pages at the bottom of public pages.
              </p>
            </div>
            <Switch
              checked={design.site_footer_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, site_footer_enabled: v })}
              disabled={busy}
            />
          </div>

          {design.site_footer_enabled ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Footer pages</Label>
                {selectedFooterPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add pages to display in footer.</p>
                ) : (
                  <ul className="space-y-2">
                    {footerSelection.map((id, idx) => (
                      <li key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span>{pagesById.get(id)?.title || "Untitled"}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || idx === 0}
                            onClick={() => {
                              const next = [...footerSelection];
                              [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                              saveFooter(next);
                            }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy || idx === footerSelection.length - 1}
                            onClick={() => {
                              const next = [...footerSelection];
                              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                              saveFooter(next);
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            onClick={() => saveFooter(footerSelection.filter((x) => x !== id))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {footerAvailable.length > 0 ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={footerPageToAdd} onValueChange={setFooterPageToAdd}>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Add page to footer" />
                      </SelectTrigger>
                      <SelectContent>
                        {footerAvailable.map((p) => (
                          <SelectItem key={p.page_id} value={String(p.page_id)}>
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      disabled={busy || !footerPageToAdd}
                      onClick={() => {
                        const id = Number(footerPageToAdd);
                        if (!Number.isFinite(id)) return;
                        const next = [...footerSelection, id];
                        saveFooter(next);
                        const nextAvailable = footerAvailable.find((p) => p.page_id !== id);
                        setFooterPageToAdd(nextAvailable ? String(nextAvailable.page_id) : "");
                      }}
                    >
                      Add page
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
