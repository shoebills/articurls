"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  getDesignSettings,
  getMe,
  listPages,
  listBlogs,
  listCategories,
  patchDesignSettings,
  patchMe,
  updateFooterPages,
  updateMenuCategories,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, UserPage, BlogListItem, Category } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown, ChevronUp, Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiYoutube,
  SiX,
} from "react-icons/si";
import { MdOutlineEmail } from "react-icons/md";
import { FaLinkedinIn } from "react-icons/fa6";

type SocialPlatform =
  | "contact_email"
  | "instagram_link"
  | "x_link"
  | "pinterest_link"
  | "facebook_link"
  | "linkedin_link"
  | "github_link"
  | "youtube_link";

const SOCIAL_OPTIONS: Array<{
  key: SocialPlatform;
  label: string;
  icon: ReactNode;
  placeholder: string;
}> = [
  { key: "contact_email", label: "Contact email", icon: <MdOutlineEmail className="h-4 w-4" aria-hidden />, placeholder: "hello@example.com" },
  { key: "instagram_link", label: "Instagram", icon: <SiInstagram className="h-4 w-4" aria-hidden />, placeholder: "https://instagram.com/username" },
  { key: "x_link", label: "X (Twitter)", icon: <SiX className="h-4 w-4" aria-hidden />, placeholder: "https://x.com/username" },
  { key: "pinterest_link", label: "Pinterest", icon: <SiPinterest className="h-4 w-4" aria-hidden />, placeholder: "https://pinterest.com/username" },
  { key: "facebook_link", label: "Facebook", icon: <SiFacebook className="h-4 w-4" aria-hidden />, placeholder: "https://facebook.com/username" },
  { key: "linkedin_link", label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" aria-hidden />, placeholder: "https://linkedin.com/in/username" },
  { key: "github_link", label: "GitHub", icon: <SiGithub className="h-4 w-4" aria-hidden />, placeholder: "https://github.com/username" },
  { key: "youtube_link", label: "YouTube", icon: <SiYoutube className="h-4 w-4" aria-hidden />, placeholder: "https://youtube.com/@username" },
];

function SectionPanel({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <p className="text-base font-semibold leading-none tracking-tight">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronDown
          className={cn("ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t px-6 py-5 space-y-5">{children}</div>}
    </div>
  );
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuCatSelection, setMenuCatSelection] = useState<number[]>([]);
  const [catToAdd, setCatToAdd] = useState<string>("");
  const [footerSelection, setFooterSelection] = useState<number[]>([]);
  const [footerPageToAdd, setFooterPageToAdd] = useState<string>("");
  const [blogToAdd, setBlogToAdd] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Bio and social links state (saved via patchMe, displayed in about section)
  const [bio, setBio] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<SocialPlatform, string>>({
    contact_email: "",
    instagram_link: "",
    x_link: "",
    pinterest_link: "",
    facebook_link: "",
    linkedin_link: "",
    github_link: "",
    youtube_link: "",
  });
  const [enabledSocials, setEnabledSocials] = useState<SocialPlatform[]>([]);
  const [addingSocial, setAddingSocial] = useState(false);
  const [socialToAdd, setSocialToAdd] = useState<SocialPlatform | "">("");
  const [bioSaved, setBioSaved] = useState(false);

  // All sections closed by default
  const [openSection, setOpenSection] = useState<"navbar" | "featured" | "footer" | null>(null);

  const pagesById = useMemo(() => new Map(pages.map((p) => [p.page_id, p])), [pages]);
  const catsById = useMemo(() => new Map(categories.map((c) => [c.category_id, c])), [categories]);

  async function load() {
    if (!token) return;
    try {
      const [d, p, b, c, me] = await Promise.all([
        getDesignSettings(token),
        listPages(token),
        listBlogs(token),
        listCategories(token),
        getMe(token),
      ]);
      setDesign({
        ...d,
        featured_blog_ids: d.featured_blog_ids || [],
      });
      setPages(p);
      setBlogs(b.filter((x) => x.status === "published"));
      setCategories(c);
      const selectedCats = [...c]
        .filter((x) => x.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 9999) - (b.menu_order ?? 9999))
        .map((x) => x.category_id);
      setMenuCatSelection(selectedCats);
      const firstCatAvailable = c.find((x) => !selectedCats.includes(x.category_id));
      setCatToAdd(firstCatAvailable ? String(firstCatAvailable.category_id) : "");
      const selectedFooter = [...p]
        .filter((x) => x.show_in_footer)
        .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999))
        .map((x) => x.page_id);
      setFooterSelection(selectedFooter);
      const firstFooterAvailable = p.find((x) => !selectedFooter.includes(x.page_id));
      setFooterPageToAdd(firstFooterAvailable ? String(firstFooterAvailable.page_id) : "");
      // Load bio and social links from user settings
      const nextLinks: Record<SocialPlatform, string> = {
        contact_email: me.contact_email || "",
        instagram_link: me.instagram_link || "",
        x_link: me.x_link || "",
        pinterest_link: me.pinterest_link || "",
        facebook_link: me.facebook_link || "",
        linkedin_link: me.linkedin_link || "",
        github_link: me.github_link || "",
        youtube_link: me.youtube_link || "",
      };
      setBio(me.bio || "");
      setSocialLinks(nextLinks);
      setEnabledSocials(
        SOCIAL_OPTIONS.map((s) => s.key).filter((key) => (nextLinks[key] || "").trim() !== "")
      );
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
      const rows = await updateMenuCategories(token, nextSelection);
      setCategories(rows);
      setMenuCatSelection(nextSelection);
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

  async function saveBioSocials() {
    if (!token) return;
    if ((bio.trim() ? bio.trim().split(/\s+/).length : 0) > 200) {
      setErr("Bio must be 200 words or fewer");
      return;
    }
    setBusy(true);
    setErr(null);
    setBioSaved(false);
    try {
      await patchMe(token, {
        bio,
        contact_email: socialLinks.contact_email || null,
        instagram_link: socialLinks.instagram_link || null,
        x_link: socialLinks.x_link || null,
        pinterest_link: socialLinks.pinterest_link || null,
        facebook_link: socialLinks.facebook_link || null,
        linkedin_link: socialLinks.linkedin_link || null,
        github_link: socialLinks.github_link || null,
        youtube_link: socialLinks.youtube_link || null,
      });
      setBioSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function addSocial() {
    if (!socialToAdd) return;
    setEnabledSocials((prev) => (prev.includes(socialToAdd) ? prev : [...prev, socialToAdd]));
    setAddingSocial(false);
    setSocialToAdd("");
  }

  const hiddenSocialOptions = SOCIAL_OPTIONS.filter((s) => !enabledSocials.includes(s.key));

  const availableCats = categories.filter((c) => !menuCatSelection.includes(c.category_id));
  const footerAvailable = pages.filter((p) => !footerSelection.includes(p.page_id));
  const selectedMenuCats = menuCatSelection
    .map((id) => catsById.get(id))
    .filter((c): c is Category => Boolean(c));
  const selectedFooterPages = footerSelection
    .map((id) => pagesById.get(id))
    .filter((p): p is UserPage => Boolean(p));
  const previewBlogName = (design.nav_blog_name || "").trim() || "My Blog";

  function toggle(section: "navbar" | "featured" | "footer") {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Design</h1>

      {/* Navigation bar */}
      <SectionPanel
        title="Navigation bar"
        description="Control public navigation for your profile/blog."
        open={openSection === "navbar"}
        onToggle={() => toggle("navbar")}
      >
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
                <p className="text-sm text-muted-foreground">Show categories in navbar.</p>
              </div>
              <Switch
                checked={design.nav_menu_enabled}
                onCheckedChange={(v) => saveDesign({ ...design, nav_menu_enabled: v })}
                disabled={busy}
              />
            </div>
            {design.nav_menu_enabled ? (
              <div className="space-y-3 rounded-lg border p-3">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Create categories first from the Categories section.</p>
                ) : (
                  <>
                    {menuCatSelection.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Add categories to display.</p>
                    ) : (
                      <ul className="space-y-2">
                        {menuCatSelection.map((id, idx) => (
                          <li key={id} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span>{catsById.get(id)?.name || "Untitled"}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={busy || idx === 0}
                                onClick={() => {
                                  const next = [...menuCatSelection];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  saveMenu(next);
                                }}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={busy || idx === menuCatSelection.length - 1}
                                onClick={() => {
                                  const next = [...menuCatSelection];
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
                                onClick={() => saveMenu(menuCatSelection.filter((x) => x !== id))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {availableCats.length > 0 ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select value={catToAdd} onValueChange={setCatToAdd}>
                          <SelectTrigger className="sm:max-w-xs">
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
                        <Button
                          variant="outline"
                          disabled={busy || !catToAdd}
                          onClick={() => {
                            const id = Number(catToAdd);
                            if (!Number.isFinite(id)) return;
                            const next = [...menuCatSelection, id];
                            saveMenu(next);
                            const nextAvailable = availableCats.find((c) => c.category_id !== id);
                            setCatToAdd(nextAvailable ? String(nextAvailable.category_id) : "");
                          }}
                        >
                          Add category
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
                    selectedMenuCats.length > 0 ? (
                      <div className="space-y-1">
                        {selectedMenuCats.map((c) => (
                          <p key={c.category_id} className="rounded px-2 py-1 text-sm hover:bg-muted">
                            {c.name}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="px-2 py-1 text-sm text-muted-foreground">Add categories to display.</p>
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
                      selectedMenuCats.length > 0 ? (
                        selectedMenuCats.length <= 5 ? (
                          <div className="flex min-w-0 items-center gap-3">
                            {selectedMenuCats.map((c) => (
                              <span key={c.category_id} className="whitespace-nowrap text-sm text-muted-foreground">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border">
                            <Menu className="h-4 w-4" />
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">Add categories to display.</span>
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
      </SectionPanel>

      {/* Featured blogs */}
      <SectionPanel
        title="Body"
        description="Pin up to 10 published blogs to the top of your public profile."
        open={openSection === "featured"}
        onToggle={() => toggle("featured")}
      >
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
      </SectionPanel>

      {/* Footer */}
      <SectionPanel
        title="Footer"
        description="Control About section under blogs and site footer content."
        open={openSection === "footer"}
        onToggle={() => toggle("footer")}
      >
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

        {design.footer_enabled ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1400}
                placeholder="Optional short bio (max 200 words)"
              />
              <p className="text-xs text-muted-foreground">{bio.trim() ? bio.trim().split(/\s+/).length : 0}/200 words</p>
            </div>
            <div className="space-y-3">
              <Label>Socials</Label>
              {enabledSocials.length > 0 ? (
                <div className="space-y-3">
                  {enabledSocials.map((platformKey) => {
                    const option = SOCIAL_OPTIONS.find((s) => s.key === platformKey);
                    if (!option) return null;
                    return (
                      <div key={platformKey} className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                          {option.icon}
                        </div>
                        <Input
                          type={platformKey === "contact_email" ? "email" : "url"}
                          value={socialLinks[platformKey]}
                          onChange={(e) =>
                            setSocialLinks((prev) => ({ ...prev, [platformKey]: e.target.value }))
                          }
                          placeholder={option.placeholder}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setEnabledSocials((prev) => prev.filter((k) => k !== platformKey));
                            setSocialLinks((prev) => ({ ...prev, [platformKey]: "" }));
                          }}
                          aria-label={`Remove ${option.label}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No socials added yet.</p>
              )}
              {hiddenSocialOptions.length > 0 ? (
                addingSocial ? (
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <Select value={socialToAdd} onValueChange={(v) => setSocialToAdd(v as SocialPlatform)}>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Select social platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {hiddenSocialOptions.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={addSocial} disabled={!socialToAdd}>
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAddingSocial(false); setSocialToAdd(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      setAddingSocial(true);
                      setSocialToAdd(hiddenSocialOptions[0]?.key || "");
                    }}
                    aria-label="Add social platform"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )
              ) : null}
            </div>
            <div className="border-t border-border/60 pt-3 flex items-center gap-3">
              <Button size="sm" onClick={saveBioSocials} disabled={busy}>
                Save
              </Button>
              {bioSaved && <p className="text-sm text-emerald-600">Saved.</p>}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Enable footer pages</p>
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
      </SectionPanel>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
