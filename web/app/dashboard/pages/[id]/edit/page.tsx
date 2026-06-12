"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import slugify from "slugify";
import { ApiError, archivePage, getPage, publishPage, updatePage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, ExternalLink, ArrowLeft } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { MARKETING_ORIGIN } from "@/lib/env";
import { getContentExcerpt } from "@/lib/utils";

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
  const metaTitleRef = useRef(metaTitle);
  const metaTitleDirtyRef = useRef(metaTitleDirty);
  const metaDescDirtyRef = useRef(metaDescDirty);
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
    if (!metaDescDirty) {
      setMetaDesc(getContentExcerpt(content));
    }
  }, [content, metaDescDirty]);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { slugCustomRef.current = slugCustom; }, [slugCustom]);
  useEffect(() => { metaTitleRef.current = metaTitle; }, [metaTitle]);
  useEffect(() => { metaTitleDirtyRef.current = metaTitleDirty; }, [metaTitleDirty]);
  useEffect(() => { metaDescDirtyRef.current = metaDescDirty; }, [metaDescDirty]);
  useEffect(() => { metaDescRef.current = metaDesc; }, [metaDesc]);

  const isDirty = useCallback(() => {
    if (!page) return false;
    const nextTitle = title.trim();
    const slugEditable = page.status === "draft";
    const nextSlug = slugEditable
      ? slugCustom.trim() || slugify(nextTitle, { lower: true, strict: true }) || page.slug
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
  }, [page, title, content, slugCustom, metaTitleDirty, metaTitle, metaDescDirty, metaDesc]);

  async function save(silent = false) {
    if (!token || !page) return false;
    if (!isDirty()) return true;
    const slugEditable = page.status === "draft";
    const nextTitle = title.trim();
    const nextContent = content;
    const nextSlugCustom = slugCustom;
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
          ? { slug: nextSlugCustom.trim() || slugify(nextTitle, { lower: true, strict: true }) || page.slug }
          : {}),
        meta_title: !nextMetaTitleDirty || nextMetaTitle.trim() === nextTitle ? null : nextMetaTitle.trim() || null,
        meta_description:
          !nextMetaDescDirty || nextMetaDesc.trim() === getContentExcerpt(nextContent)
            ? null
            : nextMetaDesc.trim() || null,
      };
      const responsePage = await updatePage(token, page.page_id, body);
      setPage(responsePage);
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
          metaTitle,
          metaTitleDirty,
          metaDesc,
        })
      );
      setSaveStatus("saved");
    }, 350);
  }, [page, requiresManualUpdate, dirty, manualDraftKey, title, content, slugCustom, metaTitle, metaTitleDirty, metaDesc]);

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

  const slugEditable = page.status === "draft";

  function getConfirmLine(): string {
    if (!page) return "";
    if (pendingAction === "undo") return "Discard unsaved changes?";
    if (pendingAction === "publish") return "Publish this page now?";
    if (pendingAction === "archive") return "Archive this page?";
    if (pendingAction === "unarchive") return "Unarchive this page?";
    if (page.status === "published") return "This will update your live page.";
    return "Save changes to this archived page?";
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
          ? "Saving changes..."
          : saveStatus === "saved"
            ? "Saved"
            : "\u00a0"}
      </p>

      <BlogEditor key={page.page_id} blogId={null} pageId={page.page_id} token={token} content={content} onChange={setContent} />

      <div className="mt-6 rounded-lg border border-border bg-muted/30">
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
                onChange={(e) => setSlugCustom(e.target.value)}
                placeholder="Same as title by default"
              />
              <p className="text-xs text-muted-foreground">
                {slugEditable
                  ? "Updates from the title until you edit this field. Must be unique before you publish."
                  : "The public URL cannot be changed after the page is published."}
              </p>
            </div>

            <Separator />

            {/* Search Engine Optimization */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Search Engine Optimization</h3>
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
          <Button variant="default" onClick={() => setPendingAction("publish")} disabled={saving}>
            Publish
          </Button>
        )}
        {page.status === "published" && (
          <Button variant="outline" onClick={() => setPendingAction("archive")} disabled={saving}>
            Archive
          </Button>
        )}
        {page.status === "archived" && (
          <Button variant="outline" onClick={() => setPendingAction("unarchive")} disabled={saving}>
            Unarchive
          </Button>
        )}
      </div>

      <Dialog open={pendingAction !== null} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent className="!w-[90vw] !max-w-[22rem] rounded-lg p-4 sm:!w-[min(calc(100vw-1.5rem),32rem)] sm:!max-w-[32rem] sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium leading-snug">{getConfirmLine()}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmPendingAction}>
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
