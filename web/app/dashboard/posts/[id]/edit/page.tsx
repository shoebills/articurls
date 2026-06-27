"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import slugify from "slugify";
import {
  getBlog,
  updateBlog,
  publishBlog,
  archiveBlog,
  scheduleBlog,
  unscheduleBlog,
  uploadBlogMedia,
  deleteBlogMediaByUrl,
  listCategories,
  createCategory,
  assignBlogCategories,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogDetail, Category } from "@/lib/types";
import { format } from "date-fns";
import { BlogEditor } from "@/components/editor/blog-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { SchedulePublishDialog } from "@/components/schedule-publish-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { transformImageUrl } from "@/lib/image-transform";
import { getContentExcerpt } from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Check, ChevronLeft } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";

const DRAFT_SLUG_RE = /^draft-[0-9a-f]{12}$/i;

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const blogId = Number(id);
  const { token, isPro, wasPro, refreshUser, user } = useAuth();

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [slugCustom, setSlugCustom] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaTitleDirty, setMetaTitleDirty] = useState(false);
  const [metaDescDirty, setMetaDescDirty] = useState(false);
  const [metaDesc, setMetaDesc] = useState("");
  const [notify, setNotify] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [hidePreviewInLists, setHidePreviewInLists] = useState(false);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "undo" | "update" | "unschedule" | "publish" | "archive" | "unarchive">(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);
  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const notifyRef = useRef(notify);
  const featuredImageUrlRef = useRef(featuredImageUrl);
  const hidePreviewInListsRef = useRef(hidePreviewInLists);
  const savedCatIdsRef = useRef<number[]>([]);

  // Category assignment state
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [pendingCatIds, setPendingCatIds] = useState<number[]>([]);
  const [catBusy, setCatBusy] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const catDropdownRef = useRef<HTMLDivElement | null>(null);

  const applyBlogToForm = useCallback((b: BlogDetail) => {
    setBlog(b);
    setTitle(b.title);
    setContent(b.content);
    const slugEditable = b.status === "draft" || b.status === "scheduled";
    if (!slugEditable) {
      setSlugCustom(b.slug);
    } else {
      const derived = slugify(b.title, { lower: true, strict: true });
      const isPlaceholderDraftSlug = DRAFT_SLUG_RE.test(b.slug);
      const slugMatchesTitle = derived !== "" && b.slug === derived;
      setSlugCustom(isPlaceholderDraftSlug || slugMatchesTitle ? "" : b.slug);
    }
    setMetaTitle(b.meta_title || "");
    const metaSynced = !b.meta_title || b.meta_title === b.title;
    setMetaTitleDirty(!metaSynced);
    setMetaDesc(b.meta_description || "");
    const contentExcerpt = getContentExcerpt(b.content || "");
    const descSynced = !b.meta_description || b.meta_description === contentExcerpt;
    setMetaDescDirty(!descSynced);
    setFeaturedImageUrl(b.featured_image_url || "");
    setHidePreviewInLists(b.hide_preview_in_lists);
    setNotify(b.notify_subscribers);
    const blogCatIds = (b as unknown as { category_ids?: number[] }).category_ids || [];
    setSelectedCatIds(blogCatIds);
    setPendingCatIds(blogCatIds);
    savedCatIdsRef.current = [...blogCatIds];
  }, []);

  const load = useCallback(async () => {
    if (!token || Number.isNaN(blogId)) return;
    setErr(null);
    try {
      const b = await getBlog(token, blogId);
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token, blogId, applyBlogToForm]);

  // Load categories for the dropdown
  useEffect(() => {
    if (!token) return;
    listCategories(token).then(setAllCategories).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!catDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [catDropdownOpen]);

  useEffect(() => {
    load();
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

  useEffect(() => {
    const el = titleTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [title]);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { slugCustomRef.current = slugCustom; }, [slugCustom]);
  useEffect(() => { metaTitleRef.current = metaTitle; }, [metaTitle]);
  useEffect(() => { metaTitleDirtyRef.current = metaTitleDirty; }, [metaTitleDirty]);
  useEffect(() => { metaDescDirtyRef.current = metaDescDirty; }, [metaDescDirty]);
  useEffect(() => { metaDescRef.current = metaDesc; }, [metaDesc]);
  useEffect(() => { notifyRef.current = notify; }, [notify]);
  useEffect(() => { featuredImageUrlRef.current = featuredImageUrl; }, [featuredImageUrl]);
  useEffect(() => { hidePreviewInListsRef.current = hidePreviewInLists; }, [hidePreviewInLists]);

  const slugEditable = blog ? blog.status === "draft" || blog.status === "scheduled" : false;

  const isDirty = useCallback(() => {
    if (!blog) return false;
    const nextSlug = slugCustom.trim() || slugify(title.trim(), { lower: true, strict: true }) || blog.slug;
    const nextMetaTitle =
      !metaTitleDirty || metaTitle.trim() === title.trim() ? null : metaTitle.trim() || null;
    const contentExcerpt = getContentExcerpt(content);
    const nextMetaDesc = !metaDescDirty || metaDesc.trim() === contentExcerpt ? null : metaDesc.trim() || null;
    const blogContentExcerpt = getContentExcerpt(blog.content || "");
    const currentMetaTitle =
      !blog.meta_title || blog.meta_title === blog.title ? null : blog.meta_title;
    const currentMetaDesc =
      !blog.meta_description || blog.meta_description === blogContentExcerpt ? null : blog.meta_description;
    const nextFeatured = featuredImageUrl.trim() || null;
    const nextHidePreview = hidePreviewInLists;
    const catDirty =
      savedCatIdsRef.current.length !== selectedCatIds.length ||
      savedCatIdsRef.current.some((id) => !selectedCatIds.includes(id));
    return (
      blog.title !== title ||
      (blog.content || "") !== (content || "") ||
      blog.notify_subscribers !== notify ||
      (slugEditable && blog.slug !== nextSlug) ||
      currentMetaTitle !== nextMetaTitle ||
      currentMetaDesc !== nextMetaDesc ||
      (blog.featured_image_url || null) !== nextFeatured ||
      blog.hide_preview_in_lists !== nextHidePreview ||
      catDirty
    );
  }, [blog, title, content, notify, slugEditable, slugCustom, metaTitleDirty, metaTitle, metaDescDirty, metaDesc, selectedCatIds, pendingCatIds, featuredImageUrl, hidePreviewInLists]);

  async function save(silent = false) {
    if (!token || !blog) return false;
    if (!isDirty()) return true;
    const nextTitle = title;
    const nextContent = content;
    const nextNotify = notify;
    const nextSlugCustom = slugCustom;
    const nextMetaTitle = metaTitle;
    const nextMetaTitleDirty = metaTitleDirty;
    const nextMetaDesc = metaDesc;
    const nextMetaDescDirty = metaDescDirty;
    const nextFeaturedImageUrl = featuredImageUrl;
    const nextHidePreview = hidePreviewInLists;
    const nextPendingCatIds = pendingCatIds;
    const catDirty =
      savedCatIdsRef.current.length !== nextPendingCatIds.length ||
      savedCatIdsRef.current.some((id) => !nextPendingCatIds.includes(id));
    setSaving(true);
    setSaveStatus("saving");
    if (!silent) setErr(null);
    try {
      const body: Parameters<typeof updateBlog>[2] = {
        title: nextTitle,
        content: nextContent,
        notify_subscribers: nextNotify,
      };

      if (slugEditable) {
        const derived = slugify(nextTitle.trim(), { lower: true, strict: true });
        const nextSlug = nextSlugCustom.trim() || derived || blog.slug;
        body.slug = nextSlug;
      }

      if (!nextMetaTitleDirty || nextMetaTitle.trim() === nextTitle.trim()) {
        body.meta_title = null;
      } else if (nextMetaTitle.trim()) {
        body.meta_title = nextMetaTitle.trim();
      } else {
        body.meta_title = null;
      }

      if (!nextMetaDescDirty || nextMetaDesc.trim() === getContentExcerpt(nextContent)) {
        body.meta_description = null;
      } else if (nextMetaDesc.trim()) {
        body.meta_description = nextMetaDesc.trim();
      } else {
        body.meta_description = null;
      }
      body.featured_image_url = nextFeaturedImageUrl.trim() || null;
      body.hide_preview_in_lists = nextHidePreview;

      const responseBlog = await updateBlog(token, blog.blog_id, body);
      let finalBlog = responseBlog;
      if (catDirty) {
        finalBlog = await assignBlogCategories(token, blog.blog_id, nextPendingCatIds);
      }
      setBlog(finalBlog);

      // Only overwrite fields the user hasn't changed during the API call.
      // This prevents autosave from destroying in-flight edits.
      const titleChanged = nextTitle !== titleRef.current;
      const contentChanged = nextContent !== contentRef.current;
      const metaTitleChanged = nextMetaTitle !== metaTitleRef.current;
      const metaDescChanged = nextMetaDesc !== metaDescRef.current;
      const slugCustomChanged = nextSlugCustom !== slugCustomRef.current;
      const featuredChanged = nextFeaturedImageUrl !== featuredImageUrlRef.current;
      const hidePreviewChanged = nextHidePreview !== hidePreviewInListsRef.current;
      const notifyChanged = nextNotify !== notifyRef.current;

      if (!titleChanged) setTitle(finalBlog.title);
      if (!contentChanged) setContent(finalBlog.content || "");
      if (!metaTitleChanged) setMetaTitle(finalBlog.meta_title || "");
      if (!metaDescChanged) setMetaDesc(finalBlog.meta_description || "");
      if (slugEditable && !slugCustomChanged) setSlugCustom(finalBlog.slug);
      if (!featuredChanged) setFeaturedImageUrl(finalBlog.featured_image_url || "");
      if (!hidePreviewChanged) setHidePreviewInLists(finalBlog.hide_preview_in_lists);
      if (!notifyChanged) setNotify(finalBlog.notify_subscribers);

      // Re-derive dirty flags from effective (current) state
      const effectiveTitle = titleChanged ? titleRef.current : finalBlog.title;
      const effectiveMetaTitle = metaTitleChanged ? metaTitleRef.current : (finalBlog.meta_title || "");
      const effectiveContent = contentChanged ? contentRef.current : (finalBlog.content || "");
      const effectiveMetaDesc = metaDescChanged ? metaDescRef.current : (finalBlog.meta_description || "");
      setMetaTitleDirty(!!effectiveMetaTitle && effectiveMetaTitle !== effectiveTitle);
      setMetaDescDirty(!!effectiveMetaDesc && effectiveMetaDesc !== getContentExcerpt(effectiveContent));

      if (catDirty) {
        savedCatIdsRef.current = [...nextPendingCatIds];
        setSelectedCatIds(nextPendingCatIds);
        setPendingCatIds(nextPendingCatIds);
      }
      await refreshUser();
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

  async function publish() {
    if (!token || !blog) return;
    if (!(await save(true))) return;
    try {
      const b = await publishBlog(token, blog.blog_id);
      clearManualDraft();
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Publish failed");
    }
  }

  async function archive() {
    if (!token || !blog) return;
    if (!(await save(true))) return;
    try {
      const b = await archiveBlog(token, blog.blog_id);
      clearManualDraft();
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Archive failed");
    }
  }

  async function unarchive() {
    if (!token || !blog) return;
    if (!(await save(true))) return;
    try {
      const b = await publishBlog(token, blog.blog_id);
      clearManualDraft();
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Unarchive failed");
    }
  }

  async function doSchedule(iso: string) {
    if (!token || !blog) return;
    if (!(await save(true))) return;
    try {
      const b = await scheduleBlog(token, blog.blog_id, iso);
      applyBlogToForm(b);
      setScheduleOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Schedule failed");
    }
  }

  async function doUnschedule() {
    if (!token || !blog) return;
    if (!(await save(true))) return;
    try {
      await unscheduleBlog(token, blog.blog_id);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Unschedule failed");
    }
  }

  async function uploadFeaturedImage(file: File) {
    if (!token || !blog) return;
    setUploadingFeatured(true);
    try {
      const media = await uploadBlogMedia(token, blog.blog_id, file);
      setFeaturedImageUrl(media.url);
      setSaveStatus("idle");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Featured image upload failed");
    } finally {
      setUploadingFeatured(false);
    }
  }

  async function createCategoryInline() {
    if (!token || !newCatName.trim()) return;
    setCatBusy(true);
    setErr(null);
    try {
      const created = await createCategory(token, { name: newCatName.trim() });
      setNewCatName("");
      const updatedCats = await listCategories(token);
      setAllCategories(updatedCats);
      setPendingCatIds((prev) => [...prev, created.category_id]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create category");
    } finally {
      setCatBusy(false);
    }
  }

  useEffect(() => {
    if (!blog || saving || !isDirty() || ["scheduled", "published", "archived"].includes(blog.status)) return;
    // Don't reset to idle immediately - keep showing "Saved" until autosave triggers
    // This prevents flickering between "Saved" → "" → "Saving..." → "Saved"
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void save(true);
    }, 900);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [blog, title, content, slugCustom, metaTitle, metaTitleDirty, metaDesc, notify, featuredImageUrl, isDirty, saving]);

  useEffect(() => {
    const flushSave = () => {
      if (blog && ["scheduled", "published", "archived"].includes(blog.status)) return;
      if (isDirty() && !saving) {
        void save(true);
      }
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
  }, [isDirty, saving, blog]);

  const currentBlogId = blog?.blog_id ?? blogId;
  const requiresManualUpdate = blog ? ["scheduled", "published", "archived"].includes(blog.status) : false;
  const dirty = isDirty();
  const manualDraftKey = `articurls:manual-post-draft:${currentBlogId}`;

  const clearManualDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    window.localStorage.removeItem(manualDraftKey);
  }, [manualDraftKey]);

  useEffect(() => {
    manualDraftHydratedRef.current = false;
  }, [currentBlogId]);

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
        notify?: boolean;
        featuredImageUrl?: string;
      };
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.content === "string") setContent(draft.content);
      if (typeof draft.slugCustom === "string") setSlugCustom(draft.slugCustom);
      if (typeof draft.metaTitle === "string") setMetaTitle(draft.metaTitle);
      if (typeof draft.metaTitleDirty === "boolean") setMetaTitleDirty(draft.metaTitleDirty);
      if (typeof draft.metaDesc === "string") setMetaDesc(draft.metaDesc);
      if (typeof draft.notify === "boolean") setNotify(draft.notify);
      if (typeof draft.featuredImageUrl === "string") setFeaturedImageUrl(draft.featuredImageUrl);
    } catch {
      window.localStorage.removeItem(manualDraftKey);
    }
  }, [requiresManualUpdate, manualDraftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!blog) return;
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
          notify,
          featuredImageUrl,
        })
      );
      setSaveStatus("saved");
    }, 350);
  }, [
    blog,
    requiresManualUpdate,
    dirty,
    manualDraftKey,
    title,
    content,
    slugCustom,
    metaTitle,
    metaTitleDirty,
    metaDesc,
    notify,
    featuredImageUrl,
  ]);

  useEffect(() => {
    return () => {
      if (localAutosaveTimerRef.current) clearTimeout(localAutosaveTimerRef.current);
    };
  }, []);

  if (loading || !blog) {
    return (
      <>
        <EditorSkeleton />
        <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      </>
    );
  }

  const liveUrl =
    blog.status === "published" && user
      ? user.custom_domain && (user.domain_status === "active" || user.domain_status === "grace")
        ? `https://${user.custom_domain}/blog/${encodeURIComponent(blog.slug)}`
        : `${MARKETING_ORIGIN}/${encodeURIComponent(user.user_name)}/blog/${encodeURIComponent(blog.slug)}`
      : null;

  function getConfirmMeta(): { title: string; description?: string } {
    if (!blog) return { title: "" };
    if (pendingAction === "undo") return { title: "Discard unsaved changes?" };
    if (pendingAction === "unschedule") return { title: "Move this post back to draft?", description: "It will no longer be scheduled." };
    if (pendingAction === "publish") return { title: "Publish this post now?" };
    if (pendingAction === "archive") return { title: "Archive this post?", description: "Move this post to your archive." };
    if (pendingAction === "unarchive") return { title: "Unarchive this post?", description: "Restore the post so it appears in your published list again." };
    if (blog.status === "published") return { title: "Save changes?", description: "This will update your live post." };
    if (blog.status === "scheduled") return { title: "Save changes?", description: "This will update your scheduled post." };
    return { title: "Save changes to this archived post?" };
  }

  function confirmPendingAction() {
    if (!blog) return;
    if (pendingAction === "undo") {
      applyBlogToForm(blog);
      clearManualDraft();
      setErr(null);
      setSaveStatus("saved");
    } else if (pendingAction === "update") {
      void save(false);
    } else if (pendingAction === "unschedule") {
      void doUnschedule();
    } else if (pendingAction === "publish") {
      void publish();
    } else if (pendingAction === "archive") {
      void archive();
    } else if (pendingAction === "unarchive") {
      void unarchive();
    }
    setPendingAction(null);
  }

  return (
    <div className="mx-auto max-w-[1100px] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
            Posts
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
        {blog.status === "scheduled" && blog.scheduled_at ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold tracking-tight text-amber-700 shadow-sm shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/40" />
            </span>
            Scheduled {format(new Date(blog.scheduled_at), "MMM d, yyyy h:mm a")}
          </span>
        ) : (
          <BlogStatusBadge status={blog.status} />
        )}
        {blog.status !== "scheduled" && (
          <>
            <span className="text-slate-300 select-none" aria-hidden>
              ·
            </span>
            {blog.status === "published" && blog.published_at ? (
              <span className="whitespace-nowrap">Published {format(new Date(blog.published_at), "MMM d, yyyy")}</span>
            ) : (
              <span className="whitespace-nowrap">Updated {format(new Date(blog.updated_at), "MMM d, yyyy")}</span>
            )}
          </>
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

      <BlogEditor
        key={blog.blog_id}
        blogId={blog.blog_id}
        token={token}
        content={content}
        onChange={setContent}
      />

      {/* Email Subscribers */}
      <div className="mt-6 space-y-2">
        <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Email subscribers</p>
                  <p className="text-xs text-muted-foreground">Send this post via email to subscribers when published</p>
          </div>
          <Switch
            className="shrink-0 self-start sm:self-center"
            checked={notify}
            disabled={!isPro}
            onCheckedChange={(v) => {
              if (!isPro) return;
              setNotify(v);
            }}
          />
        </div>
        {!isPro && notify === false && (
          <p className="text-xs text-muted-foreground">{wasPro ? "Reactivate Pro to enable per-post subscriber emails." : "Upgrade to Pro in Billing to enable per-post subscriber emails."}</p>
        )}
      </div>

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
                onChange={(e) => setSlugCustom(e.target.value)}
                placeholder="Same as title by default"
              />
              <p className="text-xs text-muted-foreground">
                {slugEditable
                  ? "Updates from the title until you edit this field. Must be unique before you publish."
                  : "The public URL cannot be changed after the post is published."}
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

            <Separator />

            {/* Featured Image */}
            <div className="space-y-2">
              <Label>Featured image</Label>
              <p className="text-xs text-muted-foreground">Used for home preview and share cards. Recommended 1200×630px.</p>
              <input
                ref={featuredInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFeaturedImage(f);
                  e.currentTarget.value = "";
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => featuredInputRef.current?.click()}
                  disabled={uploadingFeatured}
                >
                  {uploadingFeatured ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
                {featuredImageUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      if (token && blog && featuredImageUrl && !content.includes(featuredImageUrl)) {
                        try {
                          await deleteBlogMediaByUrl(token, blog.blog_id, featuredImageUrl);
                        } catch {
                          // Do not block local removal if cleanup fails.
                        }
                      }
                      setFeaturedImageUrl("");
                    }}
                    disabled={uploadingFeatured}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              {featuredImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={transformImageUrl(assetUrl(featuredImageUrl), { width: 600 })}
                  alt=""
                  className="mt-2 aspect-[3/2] w-full max-w-xs rounded-lg border border-border/70 object-cover"
                />
              ) : null}
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="preview-in-lists">Preview image in blog homepage</Label>
                <p className="text-xs text-muted-foreground">Controls whether a preview image appears in blog list cards.</p>
                <Select
                  value={hidePreviewInLists ? "hidden" : "auto"}
                  onValueChange={(v) => setHidePreviewInLists(v === "hidden")}
                >
                  <SelectTrigger id="preview-in-lists" className="h-10 w-full max-w-[15rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="hidden">No preview image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label>Assign category</Label>
                <p className="text-xs text-muted-foreground">Manage categories and their visibility via{" "}
                  <Link href="/dashboard/design" className="underline underline-offset-2 hover:text-foreground transition-colors">design section</Link>
                </p>
              </div>
              <div className="relative inline-flex min-w-[14rem] max-w-full">
                <button
                  type="button"
                  className="inline-flex h-10 min-w-[14rem] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    if (!catDropdownOpen) setPendingCatIds([...selectedCatIds]);
                    setCatDropdownOpen(!catDropdownOpen);
                  }}
                  disabled={catBusy}
                >
                  <span className="truncate text-muted-foreground">
                    {selectedCatIds.length === 0
                      ? "Select categories"
                      : `${selectedCatIds.length} selected`}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${catDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {catDropdownOpen && (
                  <div ref={catDropdownRef} className="absolute left-0 top-full z-50 mt-2 min-w-[14rem] w-[max-content] rounded-xl border border-border bg-popover shadow-lg">
                    {allCategories.length === 0 ? (
                      <p className="px-3 pt-3 pb-3 text-sm text-muted-foreground">No categories yet.</p>
                    ) : (
                      <div className="max-h-56 min-w-[14rem] overflow-y-auto p-1">
                        {allCategories.map((cat) => {
                          const isChecked = pendingCatIds.includes(cat.category_id);
                          return (
                            <button
                              key={cat.category_id}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                              onClick={() => {
                                setPendingCatIds((prev) =>
                                  isChecked
                                    ? prev.filter((id) => id !== cat.category_id)
                                    : [...prev, cat.category_id]
                                );
                              }}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                                  isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                                }`}
                              >
                                {isChecked && <Check className="h-3 w-3" />}
                              </span>
                              <span className="truncate">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="border-t border-border/70 p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="New category"
                          className="h-10 min-w-0 flex-1 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") createCategoryInline();
                          }}
                        />
                        <Button size="sm" onClick={createCategoryInline} disabled={!newCatName.trim() || catBusy}>
                          Add
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1"
                          onClick={() => {
                            setPendingCatIds([...selectedCatIds]);
                            setCatDropdownOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedCatIds([...pendingCatIds]);
                            setCatDropdownOpen(false);
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {selectedCatIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCatIds.map((id) => {
                    const cat = allCategories.find((c) => c.category_id === id);
                    return cat ? (
                      <span
                        key={id}
                        className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
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
              {saving ? "Updating…" : "Update blog"}
            </Button>
          </>
        ) : (
          <></>
        )}
        {blog.status === "draft" && (
          <>
            <Button variant="default" onClick={() => setPendingAction("publish")}>
              Publish
            </Button>
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
          </>
        )}
        {blog.status === "scheduled" && (
          <>
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              Reschedule
            </Button>
            <Button variant="outline" onClick={() => setPendingAction("unschedule")}>
              Unschedule
            </Button>
          </>
        )}
        {blog.status === "published" && (
          <Button variant="outline" onClick={() => setPendingAction("archive")}>
            Archive
          </Button>
        )}
        {blog.status === "archived" && (
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
                : pendingAction === "unschedule"
                  ? "Unschedule"
                  : pendingAction === "publish"
                    ? "Publish"
                    : pendingAction === "archive"
                      ? "Archive"
                      : pendingAction === "unarchive"
                        ? "Unarchive"
                        : "Update blog"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SchedulePublishDialog open={scheduleOpen} onOpenChange={setScheduleOpen} onConfirm={doSchedule} defaultDate={blog?.scheduled_at ? new Date(blog.scheduled_at) : null} />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
