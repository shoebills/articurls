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
  assignBlogCategories,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogDetail, Category } from "@/lib/types";
import { BlogEditor } from "@/components/editor/blog-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BlogStatusBadge } from "@/components/blog-status-badge";
import { SchedulePublishDialog } from "@/components/schedule-publish-dialog";
import { Separator } from "@/components/ui/separator";
import { MARKETING_ORIGIN, assetUrl } from "@/lib/env";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Check } from "lucide-react";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const DRAFT_SLUG_RE = /^draft-[0-9a-f]{12}$/i;

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const blogId = Number(id);
  const { token, isPro, refreshUser, user } = useAuth();

  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [slugCustom, setSlugCustom] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaTitleDirty, setMetaTitleDirty] = useState(false);
  const [metaDesc, setMetaDesc] = useState("");
  const [notify, setNotify] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);
  const featuredInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Category assignment state
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [pendingCatIds, setPendingCatIds] = useState<number[]>([]);
  const [catBusy, setCatBusy] = useState(false);

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
    setFeaturedImageUrl(b.featured_image_url || "");
    setNotify(b.notify_subscribers);
    const blogCatIds = (b as unknown as { category_ids?: number[] }).category_ids || [];
    setSelectedCatIds(blogCatIds);
    setPendingCatIds(blogCatIds);
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
    load();
  }, [load]);

  useEffect(() => {
    if (!metaTitleDirty) {
      setMetaTitle(title);
    }
  }, [title, metaTitleDirty]);

  const slugEditable = blog ? blog.status === "draft" || blog.status === "scheduled" : false;

  const isDirty = useCallback(() => {
    if (!blog) return false;
    const nextSlug = slugCustom.trim() || slugify(title.trim(), { lower: true, strict: true }) || blog.slug;
    const nextMetaTitle =
      !metaTitleDirty || metaTitle.trim() === title.trim() ? null : metaTitle.trim() || null;
    const nextMetaDesc = metaDesc.trim() || null;
    const nextFeatured = featuredImageUrl.trim() || null;
    return (
      blog.title !== title ||
      blog.content !== content ||
      blog.notify_subscribers !== notify ||
      (slugEditable && blog.slug !== nextSlug) ||
      (blog.meta_title || null) !== nextMetaTitle ||
      (blog.meta_description || null) !== nextMetaDesc ||
      (blog.featured_image_url || null) !== nextFeatured
    );
  }, [blog, title, content, notify, slugEditable, slugCustom, metaTitleDirty, metaTitle, metaDesc, featuredImageUrl]);

  async function save(silent = false) {
    if (!token || !blog) return;
    if (!isDirty()) return;
    setSaving(true);
    setSaveStatus("saving");
    if (!silent) setErr(null);
    try {
      const body: Parameters<typeof updateBlog>[2] = {
        title,
        content,
        notify_subscribers: notify,
      };

      if (slugEditable) {
        const derived = slugify(title.trim(), { lower: true, strict: true });
        const nextSlug = slugCustom.trim() || derived || blog.slug;
        body.slug = nextSlug;
      }

      if (!metaTitleDirty || metaTitle.trim() === title.trim()) {
        body.meta_title = null;
      } else if (metaTitle.trim()) {
        body.meta_title = metaTitle.trim();
      } else {
        body.meta_title = null;
      }

      if (metaDesc.trim()) body.meta_description = metaDesc.trim();
      else body.meta_description = null;
      body.featured_image_url = featuredImageUrl.trim() || null;

      const updated = await updateBlog(token, blog.blog_id, body);
      applyBlogToForm(updated);
      await refreshUser();
      setSaveStatus("saved");
    } catch (e) {
      setSaveStatus("idle");
      setErr(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!token || !blog) return;
    await save(true);
    try {
      const b = await publishBlog(token, blog.blog_id);
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Publish failed");
    }
  }

  async function archive() {
    if (!token || !blog) return;
    try {
      const b = await archiveBlog(token, blog.blog_id);
      applyBlogToForm(b);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Archive failed");
    }
  }

  async function doSchedule(iso: string) {
    if (!token || !blog) return;
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

  useEffect(() => {
    if (!blog || saving || !isDirty()) return;
    setSaveStatus("idle");
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
  }, [isDirty, saving]);

  if (loading || !blog) {
    return (
      <>
        <p className="text-muted-foreground">{loading ? "Loading…" : "Not found"}</p>
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

  const slugPlaceholder = slugify(title, { lower: true, strict: true });

  return (
    <div className="mx-auto max-w-[1100px] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">← Posts</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <BlogStatusBadge status={blog.status} />
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

      <Input
        className="mb-4 min-h-0 border-none px-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0 sm:text-3xl md:text-4xl lg:text-5xl"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />
      <p className="mb-3 text-xs text-muted-foreground">
        {saveStatus === "saving" ? "Saving changes..." : saveStatus === "saved" ? "Saved" : " "}
      </p>

      <BlogEditor
        key={blog.blog_id}
        blogId={blog.blog_id}
        token={token}
        content={content}
        onChange={setContent}
      />

      <div className="mt-6">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-left text-sm font-medium"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          Advanced — slug, meta, email to subscribers
          {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {advancedOpen && (
          <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <Label>URL slug</Label>
              <Input
                value={slugCustom}
                disabled={!slugEditable}
                onChange={(e) => setSlugCustom(e.target.value)}
                placeholder={slugPlaceholder || "(from title)"}
              />
              <p className="text-xs text-muted-foreground">
                {slugEditable
                  ? "Updates from the title until you edit this field. Must be unique before you publish."
                  : "The public URL cannot be changed after the post is published."}
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
                placeholder="Same as post title"
              />
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Defaults from content" />
            </div>
            <div className="space-y-2">
              <Label>Featured image</Label>
              <p className="text-xs text-muted-foreground">Used for home preview and share cards. 3:2 recommended.</p>
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
                  src={assetUrl(featuredImageUrl)}
                  alt=""
                  className="mt-2 aspect-[3/2] w-full max-w-xs rounded-lg border border-border/70 object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Email subscribers when published</p>
                <p className="text-xs text-muted-foreground">Pro only. Sent once on first publish.</p>
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
              <p className="text-xs text-muted-foreground">Upgrade to Pro in Billing to enable per-post subscriber emails.</p>
            )}
            <Separator className="my-2" />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label>Assign category</Label>
                <p className="text-xs text-muted-foreground">Choose one or more categories for this post.</p>
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
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[14rem] w-[max-content] rounded-xl border border-border bg-popover shadow-lg">
                    {allCategories.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No categories created yet.</p>
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
                    <div className="border-t border-border/70 p-2">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={catBusy}
                        onClick={async () => {
                          if (!token || !blog) return;
                          setCatBusy(true);
                          try {
                            const updated = await assignBlogCategories(token, blog.blog_id, pendingCatIds);
                            setSelectedCatIds(pendingCatIds);
                            applyBlogToForm(updated);
                          } catch (e) {
                            setErr(e instanceof ApiError ? e.message : "Failed to assign categories");
                          } finally {
                            setCatBusy(false);
                            setCatDropdownOpen(false);
                          }
                        }}
                      >
                        {catBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                        Apply
                      </Button>
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
        <Button onClick={() => void save(false)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {blog.status === "draft" && (
          <>
            <Button variant="default" onClick={publish}>
              Publish
            </Button>
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
          </>
        )}
        {blog.status === "scheduled" && (
          <Button variant="outline" onClick={doUnschedule}>
            Unschedule
          </Button>
        )}
        {blog.status === "published" && (
          <Button variant="outline" onClick={archive}>
            Archive
          </Button>
        )}
      </div>

      <SchedulePublishDialog open={scheduleOpen} onOpenChange={setScheduleOpen} onConfirm={doSchedule} />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </div>
  );
}
