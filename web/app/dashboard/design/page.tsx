"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getDesignSettings,
  listPages,
  patchDesignSettings,
  updateMenuPages,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, UserPage } from "@/lib/types";
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
  });
  const [pages, setPages] = useState<UserPage[]>([]);
  const [menuSelection, setMenuSelection] = useState<number[]>([]);
  const [pageToAdd, setPageToAdd] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pagesById = useMemo(() => new Map(pages.map((p) => [p.page_id, p])), [pages]);

  async function load() {
    if (!token) return;
    try {
      const [d, p] = await Promise.all([getDesignSettings(token), listPages(token)]);
      setDesign(d);
      setPages(p);
      const selected = [...p]
        .filter((x) => x.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 9999) - (b.menu_order ?? 9999))
        .map((x) => x.page_id);
      setMenuSelection(selected);
      const firstAvailable = p.find((x) => !selected.includes(x.page_id));
      setPageToAdd(firstAvailable ? String(firstAvailable.page_id) : "");
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

  const available = pages.filter((p) => !menuSelection.includes(p.page_id));
  const selectedMenuPages = menuSelection
    .map((id) => pagesById.get(id))
    .filter((p): p is UserPage => Boolean(p));
  const previewBlogName = (design.nav_blog_name || "").trim() || "My Blog";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Design</h1>
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
          <CardTitle>Footer</CardTitle>
          <CardDescription>Show your profile summary below your public content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Enable footer</p>
              <p className="text-sm text-muted-foreground">
                Displays profile image, name, bio, link, and socials below your blogs/content.
              </p>
            </div>
            <Switch
              checked={design.footer_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, footer_enabled: v })}
              disabled={busy}
            />
          </div>
          <div className="space-y-3 border-t border-border/70 pt-4">
            <p className="text-sm font-medium">Live preview of footer</p>
            {design.footer_enabled ? (
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="rounded-md border bg-background p-4">
                  <h3 className="mb-6 text-xl font-semibold tracking-tight sm:text-2xl">About the author</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted ring-1 ring-border/70" aria-hidden />
                    <div>
                      <p className="font-semibold leading-tight">Your Name</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground">Your bio will appear here.</p>
                  <p className="mt-5 text-sm font-medium text-foreground underline underline-offset-4">your-link.com</p>
                  <div className="mt-6 flex items-center gap-2.5">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/25 text-xs text-muted-foreground">
                      in
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/25 text-xs text-muted-foreground">
                      x
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/25 text-xs text-muted-foreground">
                      ig
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Footer disabled.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
