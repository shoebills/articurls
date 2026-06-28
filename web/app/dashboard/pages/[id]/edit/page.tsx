"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import slugify from "slugify";
import { ApiError, archivePage, getPage, publishPage, updatePage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
import { format } from "date-fns";
import { BlogEditor } from "@/components/editor/blog-editor";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, ExternalLink, ChevronLeft } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";
import { MARKETING_ORIGIN } from "@/lib/env";
import { getContentExcerpt } from "@/lib/utils";

const DRAFT_SLUG_RE = /^draft-[0-9a-f]{12}$/i;

function normalizeEditableSlugCustom(page: UserPage): string {
  if (page.status !== "draft") return page.slug || "";
  const derived = slugify(page.title || "", { lower: true, strict: true });
  const isPlaceholderDraftSlug = DRAFT_SLUG_RE.test(page.slug || "");
  const slugMatchesTitle = derived !== "" && page.slug === derived;
  return isPlaceholderDraftSlug || slugMatchesTitle ? derived : page.slug || "";
}

export default function EditPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pageId = Number(id);
  const { token, user, refreshUser } = useAuth();

  const [page, setPage] = useState<UserPage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [slugCustom, setSlugCustom] = useState("");
  const [slugCustomDirty, setSlugCustomDirty] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaTitleDirty, setMetaTitleDirty] = useState(false);
  const [metaDescDirty, setMetaDescDirty] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [metaDesc, setMetaDesc] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "undo" | "update" | "publish" | "archive" | "unarchive">(null);
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
  const slugCustomDirtyRef = useRef(slugCustomDirty);
  const metaTitleRef = useRef(metaTitle);
  const metaTitleDirtyRef = useRef(metaTitleDirty);
  const metaDescDirtyRef = useRef(metaDescDirty);
  const metaDescRef = useRef(metaDesc);

  const applyPageToForm = useCallback((p: UserPage) => {
    setPage(p);
    setTitle(p.title || "");
    setContent(p.content || "<p></p>");
    setSlugCustom(normalizeEditableSlugCustom(p));
    {
      const derived = slugify(p.title || "", { lower: true, strict: true });
      const isPlaceholderDraftSlug = DRAFT_SLUG_RE.test(p.slug || "");
      const slugMatchesTitle = derived !== "" && p.slug === derived;
      setSlugCustomDirty(p.status !== "draft" || (!isPlaceholderDraftSlug && !slugMatchesTitle));
    }
    setMetaTitle(p.meta_title || "");
    const metaSynced = !p.meta_title || p.meta_title === p.title;
    setMetaTitleDirty(!metaSynced);
    setMetaDesc(p.meta_description || "");
    const contentExcerpt = getContentExcerpt(p.content || "");
    const descSynced = !p.meta_description || p.meta_description === contentExcerpt;
    setMetaDescDirty(!descSynced);
  }, []);

  const load = useCallback(async () => {
    if (!token || Number.isNaN(pageId)) return;
    setErr(null);
    setLoading(true);
    try {
      const [found] = await Promise.all([getPage(token, pageId), refreshUser()]);
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

  useEffect(() => {
    if (!slugCustomDirty) {
      setSlugCustom(slugify(title, { lower: true, strict: true }));
    }
  }, [title, slugCustomDirty]);

  useEffect(() => {
    if (!metaDescDirty) {
      setMetaDesc(getContentExcerpt(content));
    }
  }, [content, metaDescDirty]);

  useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [title]);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { slugCustomRef.current = slugCustom; }, [slugCustom]);
  useEffect(() => { slugCustomDirtyRef.current = slugCustomDirty; }, [slugCustomDirty]);
  useEffect(() => { metaTitleRef.current = metaTitle; }, [metaTitle]);
  useEffect(() => { metaTitleDirtyRef.current = metaTitleDirty; }, [metaTitleDirty]);
  useEffect(() => { metaDescDirtyRef.current = metaDescDirty; }, [metaDescDirty]);
  useEffect(() => { metaDescRef.current = metaDesc; }, [metaDesc]);

  const isDirty = useCallback(() => {
    if (!page) return false;
    const nextTitle = title.trim();
    const slugEditable = page.status === "draft";
    const nextSlug = slugEditable
      ? (slugCustomDirty ? slugCustom.trim() : slugify(nextTitle, { lower: true, strict: true }))
      : page.slug;
    const nextMetaTitle = !metaTitleDirty || metaTitle.trim() === nextTitle ? null : metaTitle.trim() || null;
    const contentExcerpt = getContentExcerpt(content);
    const nextMetaDesc = !metaDescDirty || metaDesc.trim() === contentExcerpt ? null : metaDesc.trim() || null;
    const pageContentExcerpt = getContentExcerpt(page.content || "");
    const currentMetaTitle =
      !page.meta_title || page.meta_title === page.title ? null : page.meta_title;
    const currentMetaDesc =
      !page.meta_description || page.meta_description === pageContentExcerpt ? null : page.meta_description;

    return (
      page.title !== nextTitle ||
      (page.content || "") !== content ||
      page.slug !== nextSlug ||
      currentMetaTitle !== nextMetaTitle ||
      currentMetaDesc !== nextMetaDesc
    );
  }, [page, title, content, slugCustom, slugCustomDirty, metaTitleDirty, metaTitle, metaDescDirty, metaDesc]);

  async function save(silent = false) {
    if (!token || !page) return false;
    if (!isDirty()) return true;
    const slugEditable = page.status === "draft";
    const nextTitle = title.trim();
    const nextContent = content;
    const nextSlugCustom = slugCustom;
    const nextSlugCustomDirty = slugCustomDirty;
    const nextMetaTitle = metaTitle;
    const nextMetaTitleDirty = metaTitleDirty;
    const nextMetaDesc = metaDesc;
    const nextMetaDescDirty = metaDescDirty;
    setSaving(true);
    setSaveStatus("saving");
    if (!silent) setErr(null);
    try {
      const body = {
        title: nextTitle,
        content: nextContent,
        ...(slugEditable
          ? { slug: (!nextSlugCustomDirty ? slugify(nextTitle, { lower: true, strict: true }) : nextSlugCustom.trim()) || slugify(nextTitle, { lower: true, strict: true }) }
          : {}),
        meta_title: !nextMetaTitleDirty || nextMetaTitle.trim() === nextTitle ? null : nextMetaTitle.trim() || null,
        meta_description:
          !nextMetaDescDirty || nextMetaDesc.trim() === getContentExcerpt(nextContent)
            ? null
            : nextMetaDesc.trim() || null,
      };
      const responsePage = await updatePage(token, page.page_id, body);
      setPage(responsePage);

      // Only overwrite fields the user hasn't changed during the API call.
      const titleChanged = nextTitle !== titleRef.current;
      const contentChanged = nextContent !== contentRef.current;
      const metaTitleChanged = nextMetaTitle !== metaTitleRef.current;
      const metaDescChanged = nextMetaDesc !== metaDescRef.current;
      const slugCustomChanged = nextSlugCustom !== slugCustomRef.current;

      if (!titleChanged) setTitle(responsePage.title);
      if (!contentChanged) setContent(responsePage.content || "");
      if (!metaTitleChanged) setMetaTitle(responsePage.meta_title || "");
      if (!metaDescChanged) setMetaDesc(responsePage.meta_description || "");
      if (slugEditable && !slugCustomChanged) setSlugCustom(responsePage.slug);

      // Re-derive dirty flags from effective (current) state
      const effectiveTitle = titleChanged ? titleRef.current : responsePage.title;
      const effectiveMetaTitle = metaTitleChanged ? metaTitleRef.current : (responsePage.meta_title || "");
      const effectiveContent = contentChanged ? contentRef.current : (responsePage.content || "");
      const effectiveMetaDesc = metaDescChanged ? metaDescRef.current : (responsePage.meta_description || "");
      setMetaTitleDirty(!!effectiveMetaTitle && effectiveMetaTitle !== effectiveTitle);
      setMetaDescDirty(!!effectiveMetaDesc && effectiveMetaDesc !== getContentExcerpt(effectiveContent));

      const effectiveSlugForDirty = slugCustomChanged ? slugCustomRef.current : responsePage.slug;
      const effectiveTitleForSlug = titleChanged ? titleRef.current : responsePage.title;
      const derivedSlug = slugify(effectiveTitleForSlug, { lower: true, strict: true });
      setSlugCustomDirty(!!effectiveSlugForDirty && effectiveSlugForDirty !== derivedSlug);
      clearManualDraft();
      setSaveStatus("saved");
      return true;
    } catch (e) {
      setSaveStatus("idle");
      setErr(e instanceof ApiError ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(next: "published" | "archived") {
    if (!token || !page) return;
    setErr(null);
    if (!(await save(true))) return;
    try {
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
  }, [page, saving, isDirty, title, content, slugCustom, slugCustomDirty, metaTitle, metaTitleDirty, metaDesc]);

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
        slugCustomDirty?: boolean;
        metaTitle?: string;
        metaTitleDirty?: boolean;
        metaDesc?: string;
      };
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (typeof draft.slugCustom === "string") setSlugCustom(draft.slugCustom);
      if (typeof draft.slugCustomDirty === "boolean") setSlugCustomDirty(draft.slugCustomDirty);
      if (typeof draft.metaTitle === "string") setMetaTitle(draft.metaTitle);
      if (typeof draft.metaTitleDirty === "boolean") setMetaTitleDirty(draft.metaTitleDirty);
      if (typeof draft.metaDesc === "string") setMetaDesc(draft.metaDesc);
    } catch {
      window.localStorage.removeItem(manualDraftKey);
    }
  }, [requiresManualUpdate, manualDraftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!page) return;
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
          slugCustomDirty,
          metaTitle,
          metaTitleDirty,
          metaDesc,
        })
      );
      setSaveStatus("saved");
    }, 350);
  }, [page, requiresManualUpdate, dirty, manualDraftKey, title, content, slugCustom, slugCustomDirty, metaTitle, metaTitleDirty, metaDesc]);

  useEffect(() => {
    return () => {
      if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    };
  }, []);

  if (loading || !page) {
    return (
      <>
        <EditorSkeleton />
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

  const slugEditable = page.status === "draft";

  function getConfirmMeta(): { title: string; description?: string } {
    if (!page) return { title: "" };
    if (pendingAction === "undo") return { title: "Discard unsaved changes?" };
    if (pendingAction === "publish") return { title: "Publish this page now?" };
    if (pendingAction === "archive") return { title: "Archive this page?", description: "Move this page to your archive." };
    if (pendingAction === "unarchive") return { title: "Unarchive this page?", description: "Restore the page so it appears in your published list again." };
    if (page.status === "published") return { title: "Save changes?", description: "This will update your live page." };
    return { title: "Save changes to this archived page?" };
  }

  function confirmPendingAction() {
    if (!page) return;
    if (pendingAction === "undo") {
      applyPageToForm(page);
      clearManualDraft();
      setErr(null);
      setSaveStatus("saved");
    } else if (pendingAction === "update") {
      void save(false);
    } else if (pendingAction === "publish") {
      void updateStatus("published");
    } else if (pendingAction === "archive") {
      void updateStatus("archived");
    } else if (pendingAction === "unarchive") {
      void updateStatus("published");
    }
    setPendingAction(null);
  }

  return (
    <div className="mx-auto max-w-[1100px] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/pages">
            <ChevronLeft className="h-4 w-4" />
            Pages
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {liveUrl && (
            <Button variant="outline" size="sm" className="h-8 min-h-0 px-3" asChild>
              <a href={liveUrl} target="_blank" rel="noopener">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                View
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-slate-500">
        <BlogStatusBadge status={page.status} />
        <span className="text-slate-300 select-none" aria-hidden>
          ·
        </span>
        {page.status === "published" && page.published_at ? (
          <span className="whitespace-nowrap">Published {format(new Date(page.published_at), "MMM d, yyyy")}</span>
        ) : (
          <span className="whitespace-nowrap">Updated {format(new Date(page.updated_at), "MMM d, yyyy")}</span>
        )}
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
          ? "Saving changes..."
          : saveStatus === "saved"
            ? "Saved"
            : "\u00a0"}
      </p>

      <BlogEditor key={page.page_id} blogId={null} pageId={page.page_id} token={token} content={content} onChange={setContent} />

      <div className="mt-6 rounded-lg border border-border bg-background">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          Advanced settings
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {advancedOpen && (
          <div className="space-y-6 px-4 py-4">
            {/* URL Slug */}
            <div className="space-y-2">
              <Label>URL slug</Label>
              <Input
                className="mt-2"
                value={slugCustom}
                disabled={!slugEditable}
                onChange={(e) => {
                  setSlugCustomDirty(true);
                  setSlugCustom(e.target.value);
                }}
                placeholder="Same as title by default"
              />
              <p className="text-xs text-muted-foreground">
                {slugEditable
                  ? "Updates from the title until you edit this field."
                  : "The public URL cannot be changed after the page is published."}
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Meta title</Label>
                  <Input
                    className="mt-2"
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitleDirty(true);
                      setMetaTitle(e.target.value);
                    }}
                    placeholder="Same as title by default"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta description</Label>
                  <Input
                    className="mt-2"
                    value={metaDesc}
                    onChange={(e) => {
                      setMetaDescDirty(true);
                      setMetaDesc(e.target.value);
                    }}
                    placeholder="Defaults from content"
                  />
                </div>
              </div>
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
              onClick={() => setPendingAction("undo")}
              disabled={saving || !dirty}
            >
              Undo
            </Button>
            <Button
              variant="default"
              onClick={() => setPendingAction("update")}
              disabled={saving || !dirty}
            >
              {saving ? "Updating…" : "Update page"}
            </Button>
          </>
        ) : (
          <></>
        )}
        {page.status === "draft" && (
          <Button variant="default" onClick={() => setPendingAction("publish")}>
            Publish
          </Button>
        )}
        {page.status === "published" && (
          <Button variant="outline" onClick={() => setPendingAction("archive")}>
            Archive
          </Button>
        )}
        {page.status === "archived" && (
          <Button variant="outline" onClick={() => setPendingAction("unarchive")}>
            Unarchive
          </Button>
        )}
      </div>

      <Dialog open={pendingAction !== null} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getConfirmMeta().title}</DialogTitle>
            {getConfirmMeta().description && (
              <DialogDescription>{getConfirmMeta().description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPendingAction}>
              {pendingAction === "undo"
                ? "Undo"
                : pendingAction === "publish"
                  ? "Publish"
                  : pendingAction === "archive"
                    ? "Archive"
                    : pendingAction === "unarchive"
                      ? "Unarchive"
                      : "Update page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
