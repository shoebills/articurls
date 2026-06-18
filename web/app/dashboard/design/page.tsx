"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  getMe,
  listPages,
  listBlogs,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  patchDesignSettings,
  patchMe,
  updateFooterPages,
  updateMenuCategories,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, NavBlogNameSize, UserPage, BlogListItem, Category, UserSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown, ChevronUp, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
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

type DesignSectionId = "header" | "featured" | "footer";

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
  sectionId,
  headingId,
  selected,
  children,
}: {
  title: string;
  description: string;
  sectionId: string;
  headingId: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-28 rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-[box-shadow,border-color] duration-200 ease-out hover:border-border hover:shadow-md motion-reduce:transition-none",
        selected && "border-border/80"
      )}
    >
      <div className="px-6 py-4">
        <div>
          <h2 id={headingId} className="text-base font-semibold leading-none tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="border-t px-6 py-5 space-y-5">{children}</div>
    </section>
  );
}

export default function DesignDashboardPage() {
  const { token } = useAuth();
  const [design, setDesign] = useState<DesignSettings>(() => {
    if (typeof window === "undefined") return {
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: false, footer_enabled: false, site_footer_enabled: false,
      featured_blogs_enabled: false, featured_blog_ids: [],
    };
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
    return cached ?? {
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: false, footer_enabled: false, site_footer_enabled: false,
      featured_blogs_enabled: false, featured_blog_ids: [],
    };
  });
  const [pages, setPages] = useState<UserPage[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? (getCachedApiData<UserPage[]>("/pages/", t) ?? []) : [];
  });
  const [blogs, setBlogs] = useState<BlogListItem[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    if (!t) return [];
    const cached = getCachedApiData<BlogListItem[]>("/blog/", t);
    return cached ? cached.filter((x) => x.status === "published") : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    return t ? (getCachedApiData<Category[]>("/categories/", t) ?? []) : [];
  });
  const [menuCatSelection, setMenuCatSelection] = useState<number[]>([]);
  const [catToAdd, setCatToAdd] = useState<string>("");
  const [footerSelection, setFooterSelection] = useState<number[]>([]);
  const [footerPageToAdd, setFooterPageToAdd] = useState<string>("");
  const [blogToAdd, setBlogToAdd] = useState<string>("");
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const t = localStorage.getItem("articurls_token");
    if (!t) return true;
    return !(
      apiCacheHas("/user/design", t) &&
      apiCacheHas("/pages/", t) &&
      apiCacheHas("/blog/", t) &&
      apiCacheHas("/categories/", t) &&
      apiCacheHas("/user/me", t)
    );
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [catCreateName, setCatCreateName] = useState("");
  const [catEditingId, setCatEditingId] = useState<number | null>(null);
  const [catEditingName, setCatEditingName] = useState("");
  const [catDeletingId, setCatDeletingId] = useState<number | null>(null);
  const [navMenuModalOpen, setNavMenuModalOpen] = useState(false);
  const [featuredPostsModalOpen, setFeaturedPostsModalOpen] = useState(false);
  const [footerPagesModalOpen, setFooterPagesModalOpen] = useState(false);

  // Bio and social links state (saved via patchMe, displayed in about section)
  const [bio, setBio] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const me = getCachedApiData<UserSettings>("/user/me", t);
    return me?.bio || "";
  });
  const [socialLinks, setSocialLinks] = useState<Record<SocialPlatform, string>>(() => {
    if (typeof window === "undefined") return { contact_email: "", instagram_link: "", x_link: "", pinterest_link: "", facebook_link: "", linkedin_link: "", github_link: "", youtube_link: "" };
    const t = localStorage.getItem("articurls_token");
    if (!t) return { contact_email: "", instagram_link: "", x_link: "", pinterest_link: "", facebook_link: "", linkedin_link: "", github_link: "", youtube_link: "" };
    const me = getCachedApiData<UserSettings>("/user/me", t);
    return {
      contact_email: me?.contact_email || "",
      instagram_link: me?.instagram_link || "",
      x_link: me?.x_link || "",
      pinterest_link: me?.pinterest_link || "",
      facebook_link: me?.facebook_link || "",
      linkedin_link: me?.linkedin_link || "",
      github_link: me?.github_link || "",
      youtube_link: me?.youtube_link || "",
    };
  });
  const [enabledSocials, setEnabledSocials] = useState<SocialPlatform[]>(() => {
    if (typeof window === "undefined") return [];
    const t = localStorage.getItem("articurls_token");
    if (!t) return [];
    const me = getCachedApiData<UserSettings>("/user/me", t);
    if (!me) return [];
    const links: Record<string, string> = {
      contact_email: me.contact_email || "",
      instagram_link: me.instagram_link || "",
      x_link: me.x_link || "",
      pinterest_link: me.pinterest_link || "",
      facebook_link: me.facebook_link || "",
      linkedin_link: me.linkedin_link || "",
      github_link: me.github_link || "",
      youtube_link: me.youtube_link || "",
    };
    return SOCIAL_OPTIONS.map((s) => s.key).filter((key) => (links[key] || "").trim() !== "");
  });
  const [addingSocial, setAddingSocial] = useState(false);
  const [socialToAdd, setSocialToAdd] = useState<SocialPlatform | "">("");
  const [selectedSection, setSelectedSection] = useState<DesignSectionId>("header");

  const pagesById = useMemo(() => new Map(pages.map((p) => [p.page_id, p])), [pages]);
  const catsById = useMemo(() => new Map(categories.map((c) => [c.category_id, c])), [categories]);

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
        nav_blog_name_size: d.nav_blog_name_size ?? "medium",
      });
      setPages(p);
      setBlogs(b.filter((x) => x.status === "published"));
      setCategories(c);
      const selectedCats = [...c]
        .filter((x) => x.show_in_menu)
        .sort((a, b) => (a.menu_order ?? 9999) - (b.menu_order ?? 9999))
        .map((x) => x.category_id);
      setMenuCatSelection(selectedCats);
      setCatToAdd(getNextCatToAdd(c, selectedCats));
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
    } finally {
      setLoading(false);
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
      showSavedToast();
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
      setCatToAdd(getNextCatToAdd(rows, nextSelection));
      showSavedToast();
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
      showSavedToast();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save footer links");
    } finally {
      setBusy(false);
    }
  }

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

  async function saveBioSocials() {
    if (!token) return;
    if ((bio.trim() ? bio.trim().split(/\s+/).length : 0) > 200) {
      setErr("Bio must be 200 words or fewer");
      return;
    }
    setBusy(true);
    setErr(null);
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
      showSavedToast();
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
  const sectionTabs: Array<{ id: DesignSectionId; label: string }> = [
    { id: "header", label: "Header" },
    { id: "featured", label: "Featured blogs" },
    { id: "footer", label: "Footer" },
  ];

  const availableCats = categories.filter((c) => !menuCatSelection.includes(c.category_id));
  const footerAvailable = pages.filter((p) => !footerSelection.includes(p.page_id));
  const selectedFooterPages = footerSelection
    .map((id) => pagesById.get(id))
    .filter((p): p is UserPage => Boolean(p));
  const blogNameSizeOptions: NavBlogNameSize[] = ["small", "medium", "large"];

  function goToSection(section: DesignSectionId) {
    setSelectedSection(section);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Design</h1>
        <nav
          aria-label="Design sections"
          className="overflow-x-auto pb-1"
        >
          <div className="inline-flex min-w-full rounded-xl border bg-muted/30 p-1 sm:min-w-0">
            {sectionTabs.map((section, i) => (
              <Button
                key={section.id}
                type="button"
                variant={i === 0 ? "default" : "ghost"}
                size="sm"
                className="h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-sm pointer-events-none"
              >
                {section.label}
              </Button>
            ))}
          </div>
        </nav>
        <SectionPanel
          title="Header"
          description="Control the header shown on your blog."
          sectionId="design-header-loading"
          headingId="design-header-loading-heading"
          selected
        >
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="shrink-0 space-y-2 sm:min-w-[220px]">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        </SectionPanel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Design</h1>
      <nav
        aria-label="Design sections"
        className="overflow-x-auto pb-1"
      >
        <div className="inline-flex min-w-full rounded-xl border bg-muted/30 p-1 sm:min-w-0">
          {sectionTabs.map((section) => (
            <Button
              key={section.id}
              type="button"
              variant={selectedSection === section.id ? "default" : "ghost"}
              size="sm"
              className="h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-sm"
              role="tab"
              aria-selected={selectedSection === section.id}
              aria-controls={`design-${section.id}`}
              onClick={() => goToSection(section.id)}
            >
              {section.label}
            </Button>
          ))}
        </div>
      </nav>

      {/* Header */}
      {selectedSection === "header" ? (
      <SectionPanel
        title="Header"
        description="Control the header shown on your blog."
        sectionId="design-header"
        headingId="design-header-heading"
        selected
      >
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="font-medium">Enable header</p>
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="blogName">Blog name</Label>
                <Input
                  id="blogName"
                  className="mt-2"
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
              <div className="shrink-0 space-y-2 sm:min-w-[220px]">
                <Label id="blog-name-size-label">
                  Font size
                </Label>
                <div
                  role="group"
                  aria-labelledby="blog-name-size-label"
                  className="mt-2 flex rounded-lg border border-border bg-muted/20 p-0.5"
                >
                  {blogNameSizeOptions.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={design.nav_blog_name_size === size ? "default" : "ghost"}
                      size="sm"
                      className="h-9 flex-1 rounded-md px-2 text-xs capitalize sm:text-sm"
                      disabled={busy}
                      onClick={() => {
                        if (design.nav_blog_name_size === size) return;
                        saveDesign({ ...design, nav_blog_name_size: size });
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-border/60" />
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="font-medium">Show category menu</p>
                <p className="text-sm text-muted-foreground">Show categories in the header.</p>
              </div>
              <Switch
                checked={design.nav_menu_enabled}
                onCheckedChange={(v) => saveDesign({ ...design, nav_menu_enabled: v })}
                disabled={busy}
              />
            </div>
            {design.nav_menu_enabled ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Menu Items</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNavMenuModalOpen(true)}
                    disabled={busy}
                  >
                    Manage
                  </Button>
                </div>
                {menuCatSelection.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {menuCatSelection.map((id) => (
                      <span key={id} className="px-3 py-1 rounded-full bg-muted text-sm">
                        {catsById.get(id)?.name || "Untitled"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories added.</p>
                )}
              </>
            ) : null}
          </>
        ) : null}

      </SectionPanel>
      ) : null}

      {/* Featured blogs */}
      {selectedSection === "featured" ? (
      <SectionPanel
        title="Featured blogs"
        description="Pin blogs to the top of blog homepage."
        sectionId="design-featured"
        headingId="design-featured-heading"
        selected
      >
        <div className="flex items-center justify-between rounded-xl border p-3">
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
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Featured Posts ({design.featured_blog_ids.length}/10)</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeaturedPostsModalOpen(true)}
                disabled={busy}
              >
                Manage
              </Button>
            </div>
            {design.featured_blog_ids.length > 0 ? (
              <ul className="space-y-3">
                {design.featured_blog_ids.map((id) => {
                  const b = blogs.find((x) => x.blog_id === id);
                  return (
                    <li key={id} className="rounded-md border px-3 py-2 text-sm">
                      <span className="block truncate">{b?.title || "Unknown blog"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        ) : null}
      </SectionPanel>
      ) : null}

      {/* About & footer */}
      {selectedSection === "footer" ? (
      <SectionPanel
        title="Footer"
        description="Control the blog footer content."
        sectionId="design-footer"
        headingId="design-footer-heading"
        selected
      >
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="font-medium">Enable about section</p>
              <p className="text-sm text-muted-foreground">
              Displays profile image, name, and bio below blogs.
            </p>
          </div>
          <Switch
            checked={design.footer_enabled}
            onCheckedChange={(v) => saveDesign({ ...design, footer_enabled: v })}
            disabled={busy}
          />
        </div>

        {design.footer_enabled ? (
          <>
            <div className="space-y-2.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                className="mt-2"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1400}
                placeholder="Optional short bio (max 200 words)"
              />
              <p className="text-xs text-muted-foreground">{bio.trim() ? bio.trim().split(/\s+/).length : 0}/200 words</p>
            </div>
            <div className="pt-1.5 flex items-center gap-3">
              <Button size="sm" onClick={saveBioSocials} disabled={busy}>
                Save
              </Button>
            </div>
          </>
        ) : null}

        <div className="border-t border-border/60" />

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <p className="font-medium">Enable footer</p>
            <p className="text-sm text-muted-foreground">
              Shows pages and social links in the footer.
            </p>
          </div>
          <Switch
            checked={design.site_footer_enabled}
            onCheckedChange={(v) => saveDesign({ ...design, site_footer_enabled: v })}
            disabled={busy}
          />
        </div>

        {design.site_footer_enabled ? (
          <>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Footer Pages</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFooterPagesModalOpen(true)}
                  disabled={busy}
                >
                  Manage
                </Button>
              </div>
              {selectedFooterPages.length > 0 ? (
                <ul className="space-y-3">
                  {footerSelection.map((id) => (
                    <li key={id} className="rounded-md border px-3 py-2 text-sm">
                      <span className="block truncate">{pagesById.get(id)?.title || "Untitled"}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-4 border-t border-border/60 pt-5">
              <p className="font-medium mb-4">Social links</p>
              {enabledSocials.length > 0 ? (
                <div className="space-y-3">
                  {enabledSocials.map((platformKey) => {
                    const option = SOCIAL_OPTIONS.find((s) => s.key === platformKey);
                    if (!option) return null;
                    return (
                      <div key={platformKey} className="flex items-center gap-2.5 text-sm">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                          {option.icon}
                        </div>
                        <Input
                          type={platformKey === "contact_email" ? "email" : "url"}
                          value={socialLinks[platformKey]}
                          className="min-w-0"
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
                <p className="text-sm text-muted-foreground">No social links added yet.</p>
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
                        onClick={() => {
                          setAddingSocial(false);
                          setSocialToAdd("");
                        }}
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
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={saveBioSocials} disabled={busy}>
                  Save
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SectionPanel>
      ) : null}

      {/* Navigation Menu Modal */}
      <Dialog open={navMenuModalOpen} onOpenChange={setNavMenuModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-2xl rounded-2xl sm:rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle>Manage Navigation Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">All categories</p>
                <p className="text-sm text-muted-foreground">
                  Create and manage categories.
                </p>
              </div>
              {categories.length === 0 ? (
                <div
                  className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-8 text-center"
                  role="status"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm ring-1 ring-border/60">
                    <Tag className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No categories yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const inMenu = menuCatSelection.includes(cat.category_id);
                    const isEditing = catEditingId === cat.category_id;
                    const isDeleting = catDeletingId === cat.category_id;
                    return (
                      <div
                        key={cat.category_id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <Input
                              value={catEditingName}
                              onChange={(e) => setCatEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onSaveRename();
                                if (e.key === "Escape") {
                                  setCatEditingId(null);
                                  setCatEditingName("");
                                }
                              }}
                              autoFocus
                              disabled={busy}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{cat.name}</span>
                              {inMenu ? (
                                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  In menu
                                </span>
                              ) : null}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {cat.blog_count ?? 0} {cat.blog_count === 1 ? "post" : "posts"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={onSaveRename}
                                disabled={busy || !catEditingName.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => {
                                  setCatEditingId(null);
                                  setCatEditingName("");
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : isDeleting ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setCatDeletingId(null)}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8"
                                onClick={() => onDeleteCategory(cat.category_id)}
                                disabled={busy}
                              >
                                Delete
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setCatEditingId(cat.category_id);
                                  setCatEditingName(cat.name);
                                }}
                                disabled={busy}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setCatDeletingId(cat.category_id)}
                                disabled={busy}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2 pt-4">
                <Input
                  placeholder="New category name"
                  value={catCreateName}
                  onChange={(e) => setCatCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateCategory();
                  }}
                  disabled={busy}
                />
                <Button onClick={onCreateCategory} disabled={busy || !catCreateName.trim()}>
                  Create
                </Button>
              </div>
            </div>
            <div className="border-t border-border/60 pt-4" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Menu order</p>
              <p className="text-sm text-muted-foreground">
                Choose which categories appear in your blog menu.
              </p>
            </div>
            {menuCatSelection.length === 0 ? (
              <div
                className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dotted border-[#e5e7eb] bg-white px-6 py-8 text-center"
                role="status"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm ring-1 ring-border/60">
                  <Tag className="h-4 w-4" aria-hidden />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {categories.length === 0 ? "No categories yet." : "Add categories to display in the menu."}
                </p>
              </div>
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
                    saveMenu([...menuCatSelection, id]);
                  }}
                >
                  Add category
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Featured Posts Modal */}
      <Dialog open={featuredPostsModalOpen} onOpenChange={setFeaturedPostsModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-2xl rounded-2xl sm:rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle>Manage Featured Posts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {design.featured_blog_ids.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add posts to feature.</p>
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
                    <SelectValue placeholder="Add post to featured" />
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
                  Add post
                </Button>
              </div>
            ) : design.featured_blog_ids.length >= 10 ? (
              <p className="text-sm text-muted-foreground mt-2">Maximum 10 posts allowed.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer Pages Modal */}
      <Dialog open={footerPagesModalOpen} onOpenChange={setFooterPagesModalOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-2xl rounded-2xl sm:rounded-xl">
          <DialogHeader className="text-left">
            <DialogTitle>Manage Footer Pages</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFooterPages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add pages to display in the footer.</p>
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
        </DialogContent>
      </Dialog>

      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
