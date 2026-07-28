"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ApiError,
  apiCacheHas,
  getCachedApiData,
  getDesignSettings,
  getMe,
  listPages,
  listBlogs,
  patchDesignSettings,
  patchMe,
  updateFooterPages,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DesignSettings, NavBlogNameSize, UserPage, BlogListItem, UserSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronDown, ChevronUp, Link as LinkIcon, Plus, X } from "lucide-react";
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

type DesignSectionId = "header" | "body" | "footer";

type SocialPlatform =
  | "website_link"
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
  { key: "website_link", label: "Website", icon: <LinkIcon className="h-4 w-4" aria-hidden />, placeholder: "https://yoursite.com" },
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
      <div className="p-5 sm:p-6">
        <div>
          <h2 id={headingId} className="text-base font-semibold leading-none tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="border-t p-5 sm:p-6 space-y-5">{children}</div>
    </section>
  );
}

export default function DesignDashboardPage() {
  const { token } = useAuth();
  const [design, setDesign] = useState<DesignSettings>(() => {
    if (typeof window === "undefined") return {
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: true, show_about_section: false, site_footer_enabled: true,
      featured_blogs_enabled: true, featured_blog_ids: [], content_width: "wide" as const, list_image_position: "above_title" as const, show_preview_in_lists: true, about_title: null,
    };
    const t = localStorage.getItem("articurls_token");
    const cached = t ? getCachedApiData<DesignSettings>("/user/design", t) : null;
    return cached ?? {
      navbar_enabled: false, nav_blog_name: null, nav_blog_name_size: "medium" as const,
      nav_menu_enabled: true, show_about_section: false, site_footer_enabled: true,
      featured_blogs_enabled: true, featured_blog_ids: [], content_width: "wide" as const, list_image_position: "above_title" as const, show_preview_in_lists: true, about_title: null,
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
      apiCacheHas("/user/me", t)
    );
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const initialBioRef = useRef<string | null>(null);
  const initialSocialLinksRef = useRef<Record<SocialPlatform, string> | null>(null);
  // Bio and social links state (saved via patchMe, displayed in about section)
  const [bio, setBio] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const me = getCachedApiData<UserSettings>("/user/me", t);
    return me?.bio || "";
  });
  // about_title read/written via design state (saved via saveDesign)
  const [socialLinks, setSocialLinks] = useState<Record<SocialPlatform, string>>(() => {
    if (typeof window === "undefined") return { website_link: "", contact_email: "", instagram_link: "", x_link: "", pinterest_link: "", facebook_link: "", linkedin_link: "", github_link: "", youtube_link: "" };
    const t = localStorage.getItem("articurls_token");
    if (!t) return { website_link: "", contact_email: "", instagram_link: "", x_link: "", pinterest_link: "", facebook_link: "", linkedin_link: "", github_link: "", youtube_link: "" };
    const me = getCachedApiData<UserSettings>("/user/me", t);
    return {
      website_link: me?.website_link || "",
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

  function showSavedToast() {
    setSavedMsg("Saved");
  }

  async function load() {
    if (!token) return;
    try {
      const [d, p, b, me] = await Promise.all([
        getDesignSettings(token),
        listPages(token),
        listBlogs(token),
        getMe(token),
      ]);
      setDesign({
        ...d,
        featured_blog_ids: d.featured_blog_ids || [],
        nav_blog_name_size: d.nav_blog_name_size ?? "medium",
      });
      setPages(p);
      setBlogs(b.filter((x) => x.status === "published"));
      const selectedFooter = [...p]
        .filter((x) => x.show_in_footer)
        .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999))
        .map((x) => x.page_id);
      setFooterSelection(selectedFooter);
      // Load bio and social links from user settings
      const nextLinks: Record<SocialPlatform, string> = {
        website_link: me.website_link || "",
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
      initialBioRef.current = me.bio || "";
      initialSocialLinksRef.current = { ...nextLinks };
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
    const previous = design;
    setDesign(next);
    setBusy(true);
    setErr(null);
    try {
      const d = await patchDesignSettings(token, next);
      setDesign(d);
      showSavedToast();
    } catch (e) {
      setDesign(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to save design");
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

  async function saveBioSocials(linksOverride?: Record<SocialPlatform, string>) {
    if (!token) return;
    if ((bio.trim() ? bio.trim().split(/\s+/).length : 0) > 50) {
      setErr("Bio must be 50 words or fewer");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const s = linksOverride ?? socialLinks;
      await patchMe(token, {
        bio,
        website_link: s.website_link || null,
        contact_email: s.contact_email || null,
        instagram_link: s.instagram_link || null,
        x_link: s.x_link || null,
        pinterest_link: s.pinterest_link || null,
        facebook_link: s.facebook_link || null,
        linkedin_link: s.linkedin_link || null,
        github_link: s.github_link || null,
        youtube_link: s.youtube_link || null,
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
    { id: "body", label: "Body" },
    { id: "footer", label: "Footer" },
  ];

  const footerAvailable = pages.filter((p) => p.status === "published" && !footerSelection.includes(p.page_id));
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
          <div className="inline-flex min-w-full rounded-xl border bg-white p-1 sm:min-w-0">
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
        <div className="inline-flex min-w-full rounded-xl border bg-white p-1 sm:min-w-0">
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
        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Enable header</p>
            <Switch
              checked={design.navbar_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, navbar_enabled: v })}
              disabled={busy}
            />
          </div>
          <p className="text-sm text-muted-foreground">If disabled, public view shows only blogs.</p>
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
                  Header font size
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
                      className="h-10 flex-1 rounded-md px-2 text-xs capitalize sm:text-sm"
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
            <div className="rounded-xl border p-3 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">Show category menu</p>
                <Switch
                  checked={design.nav_menu_enabled}
                  onCheckedChange={(v) => saveDesign({ ...design, nav_menu_enabled: v })}
                  disabled={busy}
                />
              </div>
              <p className="text-sm text-muted-foreground">Show categories in the header.</p>
            </div>
          </>
        ) : null}

      </SectionPanel>
      ) : null}

      {/* Body */}
      {selectedSection === "body" ? (
      <SectionPanel
        title="Body"
        description="Control blog list layout, about section, and featured posts."
        sectionId="design-body"
        headingId="design-body-heading"
        selected
      >
        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Enable about section</p>
            <Switch
              checked={design.show_about_section}
              onCheckedChange={(v) => saveDesign({ ...design, show_about_section: v })}
              disabled={busy}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Shows title and bio at the top of the blog list.
          </p>
        </div>

        {design.show_about_section ? (
          <>
            <div className="space-y-3">
              <Label htmlFor="about-title">Title</Label>
              <Input
                id="about-title"
                className="mt-2"
                value={design.about_title || ""}
                onChange={(e) => setDesign((prev) => ({ ...prev, about_title: e.target.value.slice(0, 40) || null }))}
                onBlur={() => saveDesign({ ...design, about_title: (design.about_title || "").trim() || null })}
                maxLength={40}
                placeholder="Eg: Hi! I'm John Doe"
              />
              <p className="text-xs text-muted-foreground">{(design.about_title || "").length}/40 characters</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                className="mt-2 min-h-[120px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                onBlur={() => saveBioSocials()}
                maxLength={1400}
                placeholder="Tell more about yourself..."
              />
              <p className="text-xs text-muted-foreground">{bio.trim() ? bio.trim().split(/\s+/).length : 0}/50 words</p>
            </div>
          </>
        ) : null}

        <div className="border-t border-border/60" />

        <div>
          <div className="space-y-1">
            <p className="font-medium">Content width</p>
            <p className="text-sm text-muted-foreground">Controls the overall width of your blog pages on desktop.</p>
          </div>
          <div className="mt-2 max-w-xs">
            <Select
              value={design.content_width}
              onValueChange={(v) => saveDesign({ ...design, content_width: v as "narrow" | "wide" })}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border/60" />

        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Show preview images</p>
            <Switch
              checked={design.show_preview_in_lists}
              onCheckedChange={(v) => saveDesign({ ...design, show_preview_in_lists: v })}
              disabled={busy}
            />
          </div>
          <p className="text-sm text-muted-foreground">Show featured or first image as a preview on the blog homepage and category pages.</p>
        </div>

        <div className="border-t border-border/60" />

        <div>
          <div className={`space-y-1 ${!design.show_preview_in_lists ? "opacity-50" : ""}`}>
            <p className="font-medium">List image position</p>
            <p className="text-sm text-muted-foreground">Choose where cover images appear on your blog homepage and category pages.</p>
          </div>
          <div className="mt-2 max-w-xs">
            <Select
              value={design.list_image_position}
              onValueChange={(v) => saveDesign({ ...design, list_image_position: v as "above_title" | "next_to_title" })}
              disabled={busy || !design.show_preview_in_lists}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above_title">Above title</SelectItem>
                <SelectItem value="next_to_title">Next to title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border/60" />

        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Enable featured blogs</p>
            <Switch
              checked={design.featured_blogs_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, featured_blogs_enabled: v })}
              disabled={busy}
            />
          </div>
          <p className="text-sm text-muted-foreground">Show a featured section at the top of the blog list.</p>
        </div>
        {design.featured_blogs_enabled ? (
          <>
            <p className="font-medium">Featured Posts ({design.featured_blog_ids.length}/12)</p>
            {design.featured_blog_ids.length > 0 ? (
              <ul className="space-y-2">
                {design.featured_blog_ids.map((id, idx) => {
                  const b = blogs.find((x) => x.blog_id === id);
                  return (
                    <li key={id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0">
                      <span className="truncate min-w-0">{b?.title || "Unknown blog"}</span>
                      <div className="flex shrink-0 items-center gap-1">
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
            ) : (
              <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">No featured posts yet.</p>
              </div>
            )}
            {design.featured_blog_ids.length < 12 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={blogToAdd} onValueChange={setBlogToAdd}>
                  <SelectTrigger className="sm:flex-1">
                    <SelectValue placeholder="Add post to featured" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogs.filter((b) => !design.featured_blog_ids.includes(b.blog_id)).length > 0 ? (
                      blogs
                        .filter((b) => !design.featured_blog_ids.includes(b.blog_id))
                        .map((b) => (
                          <SelectItem key={b.blog_id} value={String(b.blog_id)}>
                            {b.title}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="flex min-h-[56px] flex-col items-center justify-center rounded-lg border border-dashed mx-1 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-muted-foreground">No published posts yet.</p>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
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
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Maximum 12 posts allowed.</p>
            )}
          </>
        ) : null}
      </SectionPanel>
      ) : null}

      {/* Footer */}
      {selectedSection === "footer" ? (
      <SectionPanel
        title="Footer"
        description="Control the blog footer content."
        sectionId="design-footer"
        headingId="design-footer-heading"
        selected
      >
        <div className="rounded-xl border p-3 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium">Enable footer</p>
            <Switch
              checked={design.site_footer_enabled}
              onCheckedChange={(v) => saveDesign({ ...design, site_footer_enabled: v })}
              disabled={busy}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Shows pages and social links in the footer.
          </p>
        </div>

        {design.site_footer_enabled ? (
          <>
            <div className="mt-4 space-y-3">
              <p className="font-medium">Footer Pages</p>
              {selectedFooterPages.length > 0 ? (
                <ul className="space-y-2">
                  {footerSelection.map((id, idx) => (
                    <li key={id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0">
                      <span className="truncate min-w-0">{pagesById.get(id)?.title || "Untitled"}</span>
                      <div className="flex shrink-0 items-center gap-1">
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
              ) : (
                <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No pages in footer yet.</p>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={footerPageToAdd} onValueChange={setFooterPageToAdd}>
                  <SelectTrigger className="sm:flex-1">
                    <SelectValue placeholder="Add page to footer" />
                  </SelectTrigger>
                  <SelectContent>
                    {footerAvailable.length > 0 ? (
                      footerAvailable.map((p) => (
                        <SelectItem key={p.page_id} value={String(p.page_id)}>
                          {p.title}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="flex min-h-[56px] flex-col items-center justify-center rounded-lg border border-dashed mx-1 px-4 py-3 text-center">
                        <p className="text-sm font-medium text-muted-foreground">No published pages yet.</p>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
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
                            className="h-9 min-w-0"
                            onChange={(e) =>
                              setSocialLinks((prev) => ({ ...prev, [platformKey]: e.target.value }))
                            }
                            onBlur={() => saveBioSocials()}
                            placeholder={option.placeholder}
                          />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const nextLinks = { ...socialLinks, [platformKey]: "" };
                            setEnabledSocials((prev) => prev.filter((k) => k !== platformKey));
                            setSocialLinks(nextLinks);
                            saveBioSocials(nextLinks);
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
                <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No social links added yet.</p>
                </div>
              )}
              {hiddenSocialOptions.length > 0 ? (
                addingSocial ? (
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                    <Select value={socialToAdd} onValueChange={(v) => setSocialToAdd(v as SocialPlatform)}>
                      <SelectTrigger className="sm:flex-1">
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
                      <Button type="button" variant="default" onClick={addSocial} disabled={!socialToAdd}>
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
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
            </div>
          </>
        ) : null}
      </SectionPanel>
      ) : null}

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
