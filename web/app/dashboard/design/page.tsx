"use client";

import { useEffect, useState } from "react";
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
import type { DesignSettings, UserPage, BlogListItem, UserSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { SectionPanel } from "./section-panel";
import { HeaderSettings } from "./header-settings";
import { BodySettings } from "./body-settings";
import { FooterSettings } from "./footer-settings";
import { SOCIAL_OPTIONS, type DesignSectionId, type SocialPlatform } from "./constants";

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
  const [bio, setBio] = useState(() => {
    if (typeof window === "undefined") return "";
    const t = localStorage.getItem("articurls_token");
    if (!t) return "";
    const me = getCachedApiData<UserSettings>("/user/me", t);
    return me?.bio || "";
  });
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
  const [selectedSection, setSelectedSection] = useState<DesignSectionId>("header");

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
    const previous = footerSelection;
    setFooterSelection(nextSelection);
    setBusy(true);
    setErr(null);
    try {
      const rows = await updateFooterPages(token, nextSelection);
      setPages(rows);
      showSavedToast();
    } catch (e) {
      setFooterSelection(previous);
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

  const sectionTabs: Array<{ id: DesignSectionId; label: string }> = [
    { id: "header", label: "Header" },
    { id: "body", label: "Body" },
    { id: "footer", label: "Footer" },
  ];

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
              onClick={() => setSelectedSection(section.id)}
            >
              {section.label}
            </Button>
          ))}
        </div>
      </nav>

      {selectedSection === "header" ? (
        <SectionPanel
          title="Header"
          description="Control the header shown on your blog."
          sectionId="design-header"
          headingId="design-header-heading"
          selected
        >
          <HeaderSettings
            design={design}
            busy={busy}
            onDesignChange={setDesign}
            saveDesign={saveDesign}
          />
        </SectionPanel>
      ) : null}

      {selectedSection === "body" ? (
        <SectionPanel
          title="Body"
          description="Control blog list layout, about section, and featured posts."
          sectionId="design-body"
          headingId="design-body-heading"
          selected
        >
          <BodySettings
            design={design}
            blogs={blogs}
            bio={bio}
            busy={busy}
            onDesignChange={setDesign}
            saveDesign={saveDesign}
            onBioChange={setBio}
            saveBioSocials={saveBioSocials}
          />
        </SectionPanel>
      ) : null}

      {selectedSection === "footer" ? (
        <SectionPanel
          title="Footer"
          description="Control the blog footer content."
          sectionId="design-footer"
          headingId="design-footer-heading"
          selected
        >
          <FooterSettings
            design={design}
            pages={pages}
            footerSelection={footerSelection}
            socialLinks={socialLinks}
            enabledSocials={enabledSocials}
            busy={busy}
            onDesignChange={setDesign}
            saveDesign={saveDesign}
            saveFooter={saveFooter}
            saveBioSocials={saveBioSocials}
            onSocialLinksChange={setSocialLinks}
            onEnabledSocialsChange={setEnabledSocials}
          />
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
