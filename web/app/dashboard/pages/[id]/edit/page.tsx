"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import slugify from "slugify";
import { ApiError, archivePage, listPages, publishPage, updatePage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
import { BlogEditor } from "@/components/editor/blog-editor";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, ExternalLink, ArrowLeft } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { MARKETING_ORIGIN } from "@/lib/env";

const DRAFT_SLUG_RE = /^draft-[0-9a-f]{12}$/i;

function normalizeEditableSlugCustom(page: UserPage): string {
  if (page.status !== "draft") return page.slug || "";
  const derived = slugify(page.title || "", { lower: true, strict: true });
  const isPlaceholderDraftSlug = DRAFT_SLUG_RE.test(page.slug || "");
  const slugMatchesTitle = derived !== "" && page.slug === derived;
  return isPlaceholderDraftSlug || slugMatchesTitle ? "" : page.slug || "";
}

export default function EditPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pageId = Number(id);
  const { token, user, refreshUser } = useAuth();

  const [page, setPage] = useState<UserPage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [slugCustom, setSlugCustom] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaTitleDirty, setMetaTitleDirty] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [metaDesc, setMetaDesc] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDraftHydratedRef = useRef(false);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const slugCustomRef = useRef(slugCustom);
  const metaTitleRef = useRef(metaTitle);
  const metaTitleDirtyRef = useRef(metaTitleDirty);
  const metaDescRef = useRef(metaDesc);

  const applyPageToForm = useCallback((p: UserPage) => {
    setPage(p);
    setTitle(p.title || "");
    setContent(p.content || "<p></p>");
    setSlugCustom(normalizeEditableSlugCustom(p));
    setMetaTitle(p.meta_title || "");
    const metaSynced = !p.meta_title || p.meta_title === p.title;
    setMetaTitleDirty(!metaSynced);
    setMetaDesc(p.meta_description || "");
  }, []);

  const canEditSlug = page?.status === "draft";

  const load = useCallback(async () => {
    if (!token || Number.isNaN(pageId)) return;
    setErr(null);
    setLoading(true);
    try {
      const [pages] = await Promise.all([listPages(token), refreshUser()]);
      const found = pages.find((p) => p.page_id === pageId);
      if (!found) {
        setErr("Page not found");
        return;
      }
      applyPageToForm(found);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token, pageId, refreshUser, applyPageToForm]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!metaTitleDirty) {
      setMetaTitle(title);
    }
  }, [title, metaTitleDirty]);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { slugCustomRef.current = slugCustom; }, [slugCustom]);
  useEffect(() => { metaTitleRef.current = metaTitle; }, [metaTitle]);
  useEffect(() => { metaTitleDirtyRef.current = metaTitleDirty; }, [metaTitleDirty]);
  useEffect(() => { metaDescRef.current = metaDesc; }, [metaDesc]);

  const isDirty = useCallback(() => {
    if (!page) return false;
    const nextTitle = title.trim();
    const nextSlug = canEditSlug
      ? slugCustom.trim() || slugify(nextTitle, { lower: true, strict: true }) || page.slug
      : page.slug;
    const nextMetaTitle = !metaTitleDirty || metaTitle.trim() === nextTitle ? null : metaTitle.trim() || null;
    const nextMetaDesc = metaDesc.trim() || null;

    return (
      page.title !== nextTitle ||
      (page.content || "") !== content ||
      page.slug !== nextSlug ||
      (page.meta_title || null) !== nextMetaTitle ||
      (page.meta_description || null) !== nextMetaDesc
    );
  }, [page, canEditSlug, title, slugCustom, metaTitleDirty, metaTitle, metaDesc, content]);

  async function save(silent = false) {
    if (!token || !page) return;
    if (!title.trim()) {
      setErr("Page title is required");
      return;
    }
    if (!isDirty()) return;
    const nextTitle = title.trim();
    const nextContent = content;
    const nextSlugCustom = slugCustom;
    const nextMetaTitle = metaTitle;
    const nextMetaTitleDirty = metaTitleDirty;
    const nextMetaDesc = metaDesc;
    setSaving(true);
    setSaveStatus("saving");
    if (!silent) setErr(null);
    try {
      const body = {
        title: nextTitle,
        content: nextContent,
        ...(canEditSlug
          ? { slug: nextSlugCustom.trim() || slugify(nextTitle, { lower: true, strict: true }) || page.slug }
          : {}),
        meta_title: !nextMetaTitleDirty || nextMetaTitle.trim() === nextTitle ? null : nextMetaTitle.trim() || null,
        meta_description: nextMetaDesc.trim() || null,
      };
      const updated = await updatePage(token, page.page_id, body);
      setPage(updated);
      if (titleRef.current.trim() === nextTitle) setTitle(updated.title || "");
      if (contentRef.current === nextContent) setContent(updated.content || "<p></p>");
      if (canEditSlug && slugCustomRef.current === nextSlugCustom) {
        setSlugCustom(normalizeEditableSlugCustom(updated));
      }
      if (metaTitleRef.current === nextMetaTitle && metaTitleDirtyRef.current === nextMetaTitleDirty) {
        setMetaTitle(updated.meta_title || "");
        const metaSynced = !updated.meta_title || updated.meta_title === updated.title;
        setMetaTitleDirty(!metaSynced);
      }
      if (metaDescRef.current === nextMetaDesc) setMetaDesc(updated.meta_description || "");
      clearManualDraft();
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("idle");
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(next: "published" | "archived") {
    if (!token || !page) return;
    setErr(null);
    try {
      if (next === "published") {
        await save(true);
      }
      const updated =
        next === "published"
          ? await publishPage(token, page.page_id)
          : await archivePage(token, page.page_id);
      clearManualDraft();
      applyPageToForm(updated);
      setSaveStatus("saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to update page status");
    }
  }

  useEffect(() => {
    if (!page || saving || !isDirty() || ["published", "archived"].includes(page.status)) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void save(true);
    }, 900);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [page, saving, isDirty, title, content, slugCustom, metaTitle, metaTitleDirty, metaDesc]);

  useEffect(() => {
    const flushSave = () => {
      if (page && ["published", "archived"].includes(page.status)) return;
      if (isDirty() && !saving) void save(true);
    };
    const onBeforeUnload = () => {
      flushSave();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", flushSave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", flushSave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isDirty, saving, page]);

  const currentPageId = page?.page_id ?? pageId;
  const requiresManualUpdate = page ? ["published", "archived"].includes(page.status) : false;
  const dirty = isDirty();
  const manualDraftKey = `articurls:manual-page-draft:${currentPageId}`;

  const clearManualDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    window.localStorage.removeItem(manualDraftKey);
  }, [manualDraftKey]);

  useEffect(() => {
    manualDraftHydratedRef.current = false;
  }, [currentPageId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!requiresManualUpdate || manualDraftHydratedRef.current) return;
    const raw = window.localStorage.getItem(manualDraftKey);
    manualDraftHydratedRef.current = true;
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        title?: string;
        content?: string;
        slugCustom?: string;
        metaTitle?: string;
        metaTitleDirty?: boolean;
        metaDesc?: string;
      };
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (typeof draft.slugCustom === "string") setSlugCustom(draft.slugCustom);
      if (typeof draft.metaTitle === "string") setMetaTitle(draft.metaTitle);
      if (typeof draft.metaTitleDirty === "boolean") setMetaTitleDirty(draft.metaTitleDirty);
      if (typeof draft.metaDesc === "string") setMetaDesc(draft.metaDesc);
    } catch {
      window.localStorage.removeItem(manualDraftKey);
    }
  }, [requiresManualUpdate, manualDraftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!requiresManualUpdate) {
      if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
      window.localStorage.removeItem(manualDraftKey);
      return;
    }
    // Wait until local draft hydration has run; otherwise first render can wipe saved drafts.
    if (!manualDraftHydratedRef.current) return;
    if (!dirty) {
      if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
      window.localStorage.removeItem(manualDraftKey);
      return;
    }
    setSaveStatus("saving");
    if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    localAutosaveTimerRef.current = setTimeout(() => {
      window.localStorage.setItem(
        manualDraftKey,
        JSON.stringify({
          title,
          content,
          slugCustom,
          metaTitle,
          metaTitleDirty,
          metaDesc,
        })
      );
      setSaveStatus("saved");
    }, 350);
  }, [requiresManualUpdate, dirty, manualDraftKey, title, content, slugCustom, metaTitle, metaTitleDirty, metaDesc]);

  useEffect(() => {
    return () => {
      if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    };
  }, []);

  if (loading || !page) {
    return (
      <>
        <p className="text-muted-foreground">{loading ? "Loading…" : "Not found"}</p>
        <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      </>
    );
  }

  const liveUrl =
    page.status === "published" && user
      ? user.custom_domain && (user.domain_status === "active" || user.domain_status === "grace")
        ? `https://${user.custom_domain}/page/${encodeURIComponent(page.slug)}`
        : `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}/page/${encodeURIComponent(page.slug)}`
      : null;

  const slugPlaceholder = slugify(title, { lower: true, strict: true });

  return (
    <div className="mx-auto max-w-[1100px] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/pages">
            <ArrowLeft className="h-4 w-4" />
            Pages
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {liveUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={liveUrl} target="_blank" rel="noopener">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <BlogStatusBadge status={page.status} />
      </div>

      <Textarea
        ref={titleTextareaRef}
        className="mb-4 min-h-0 resize-none overflow-hidden border-none px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 sm:text-3xl md:text-4xl lg:text-5xl"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }}
        placeholder="Title"
      />
      <p className="mb-3 text-xs text-muted-foreground">
        {saveStatus === "saving"
          ? requiresManualUpdate
            ? "Saving draft changes locally..."
            : "Saving changes..."
          : saveStatus === "saved"
            ? requiresManualUpdate
              ? "Draft changes saved locally"
              : "Saved"
            : "\u00a0"}
      </p>

      <BlogEditor key={page.page_id} blogId={null} pageId={page.page_id} token={token} content={content} onChange={setContent} />

      <div className="mt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          Advanced — slug & meta
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {advancedOpen && (
          <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <Label>URL slug</Label>
              <Input
                value={slugCustom}
                onChange={(e) => setSlugCustom(e.target.value)}
                placeholder={slugPlaceholder || "(from title)"}
                disabled={!canEditSlug}
              />
              <p className="text-xs text-muted-foreground">
                {canEditSlug
                  ? "Updates from the title until you edit this field. Must be unique before you publish."
                  : "Slug is permanently locked after first publish."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meta title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitleDirty(true);
                  setMetaTitle(e.target.value);
                }}
                placeholder="Same as page title"
              />
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Input
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                placeholder="Defaults from content"
              />
            </div>
          </div>
        )}
      </div>

      <Separator className="my-8" />

      <div className="flex flex-wrap gap-2">
        {requiresManualUpdate ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                applyPageToForm(page);
                clearManualDraft();
                setErr(null);
                setSaveStatus("saved");
              }}
              disabled={saving || !dirty}
            >
              Cancel
            </Button>
            <Button onClick={() => void save(false)} disabled={saving || !dirty}>
              {saving ? "Updating…" : "Update"}
            </Button>
          </>
        ) : (
          <></>
        )}
        {page.status !== "published" && (
          <Button variant="default" onClick={() => void updateStatus("published")} disabled={saving}>
            Publish
          </Button>
        )}
        {page.status === "published" && (
          <Button variant="outline" onClick={() => void updateStatus("archived")} disabled={saving}>
            Archive
          </Button>
        )}
        {page.status === "archived" && (
          <Button variant="outline" onClick={() => void updateStatus("published")} disabled={saving}>
            Unarchive
          </Button>
        )}
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
