"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuthor,
  listAuthors,
  updateAuthor,
  deleteAuthor,
  uploadAuthorAvatar,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronLeft, Loader2, Trash2, Upload, UserRound, X } from "lucide-react";
import { assetUrl } from "@/lib/env";
import slugify from "slugify";
import type { Author } from "@/lib/types";

export default function EditAuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const authorId = Number(id);
  const router = useRouter();
  const { token } = useAuth();

  const [author, setAuthor] = useState<Author | null>(null);
  const [totalAuthorsCount, setTotalAuthorsCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [xLink, setXLink] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [linkedinLink, setLinkedinLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [instagramLink, setInstagramLink] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [pinterestLink, setPinterestLink] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const populateAuthor = useCallback((a: Author) => {
    setAuthor(a);
    setName(a.name || "");
    setSlug(a.slug || "");
    setBio(a.bio || "");
    setContactEmail(a.contact_email || "");
    setWebsiteLink(a.website_link || "");
    setXLink(a.x_link || "");
    setGithubLink(a.github_link || "");
    setLinkedinLink(a.linkedin_link || "");
    setYoutubeLink(a.youtube_link || "");
    setInstagramLink(a.instagram_link || "");
    setFacebookLink(a.facebook_link || "");
    setPinterestLink(a.pinterest_link || "");
    setAvatarPreview(a.profile_image_url ? assetUrl(a.profile_image_url) : null);
    setAvatarFile(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!token || Number.isNaN(authorId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [authorData, allAuthors] = await Promise.all([
        getAuthor(token, authorId),
        listAuthors(token).catch(() => [] as Author[]),
      ]);
      populateAuthor(authorData);
      setTotalAuthorsCount(allAuthors.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load author");
    } finally {
      setLoading(false);
    }
  }, [token, authorId, populateAuthor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar image must be under 2MB");
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleRemoveAvatarPreview = () => {
    setAvatarFile(null);
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(author?.profile_image_url ? assetUrl(author.profile_image_url) : null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const isDirty =
    Boolean(author) &&
    (name.trim() !== (author?.name || "") ||
      slug.trim() !== (author?.slug || "") ||
      bio.trim() !== (author?.bio || "") ||
      contactEmail.trim() !== (author?.contact_email || "") ||
      websiteLink.trim() !== (author?.website_link || "") ||
      xLink.trim() !== (author?.x_link || "") ||
      githubLink.trim() !== (author?.github_link || "") ||
      linkedinLink.trim() !== (author?.linkedin_link || "") ||
      youtubeLink.trim() !== (author?.youtube_link || "") ||
      instagramLink.trim() !== (author?.instagram_link || "") ||
      facebookLink.trim() !== (author?.facebook_link || "") ||
      pinterestLink.trim() !== (author?.pinterest_link || "") ||
      avatarFile !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !author) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Author name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSavedMsg(null);

    try {
      const finalSlug = slug.trim() || slugify(trimmedName, { lower: true, strict: true });
      const payload: Partial<Author> = {
        name: trimmedName,
        slug: finalSlug,
        bio: bio.trim() || null,
        contact_email: contactEmail.trim() || null,
        website_link: websiteLink.trim() || null,
        x_link: xLink.trim() || null,
        github_link: githubLink.trim() || null,
        linkedin_link: linkedinLink.trim() || null,
        youtube_link: youtubeLink.trim() || null,
        instagram_link: instagramLink.trim() || null,
        facebook_link: facebookLink.trim() || null,
        pinterest_link: pinterestLink.trim() || null,
      };

      const updated = await updateAuthor(token, authorId, payload);

      if (avatarFile) {
        try {
          const res = await uploadAuthorAvatar(token, authorId, avatarFile);
          updated.profile_image_url = res.profile_image_url;
        } catch (uploadErr) {
          setError(uploadErr instanceof ApiError ? uploadErr.message : "Avatar upload failed");
        }
      }

      populateAuthor(updated);
      setSavedMsg("Author changes saved successfully");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update author");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !author) return;
    setDeleting(true);
    setError(null);

    try {
      await deleteAuthor(token, authorId);
      setDeleteDialogOpen(false);
      router.push("/dashboard/authors");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete author");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6 sm:space-y-8">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-[360px] w-full rounded-xl" />
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="mx-auto max-w-[900px] py-12 text-center space-y-4">
        <h2 className="text-xl font-semibold">Author not found</h2>
        <p className="text-sm text-muted-foreground">The author profile you are trying to edit does not exist or has been removed.</p>
        <Button asChild className="gap-2">
          <Link href="/dashboard/authors">
            <ChevronLeft className="h-4 w-4" />
            Back to Authors
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6 sm:space-y-8">
      {/* Top navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/authors"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Authors
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit Author</h1>
          {author.blog_count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {author.blog_count} {author.blog_count === 1 ? "post" : "posts"}
            </span>
          )}
        </div>
      </div>

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}
      {!error && (
        <FloatingErrorToast
          message={savedMsg}
          onDismiss={() => setSavedMsg(null)}
          autoDismissMs={3000}
          variant="success"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Profile Details</CardTitle>
            <CardDescription>
              Basic identity, byline photo, and author bio shown across articles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar upload */}
            <div className="space-y-2.5">
              <Label>Author Photo</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full object-cover border border-border shadow-xs"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl border border-primary/20">
                      {name.trim() ? name.trim().slice(0, 1).toUpperCase() : <UserRound className="h-9 w-9 text-muted-foreground/60" />}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      className="gap-2"
                      disabled={submitting}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {avatarPreview ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {avatarFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatarPreview}
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        disabled={submitting}
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel selection
                      </Button>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleAvatarSelect}
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended square image (PNG, JPG or WebP up to 2MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Name and Slug */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Author URL Slug</Label>
                <div className="flex items-center rounded-lg border border-input bg-muted/40 px-3 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="text-xs text-muted-foreground select-none font-mono">/author/</span>
                  <input
                    id="slug"
                    className="flex-1 bg-transparent py-2 pl-1 text-sm focus:outline-none disabled:opacity-50"
                    placeholder="jane-doe"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value, { lower: true, strict: true }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Author Bio</Label>
              <Textarea
                id="bio"
                placeholder="Write a short summary about this author, their background, and what they write about..."
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Links Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Social Profiles & Website</CardTitle>
            <CardDescription>
              Connect external links to display on the author&apos;s public profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  placeholder="https://janedoe.com"
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="x_link">X / Twitter</Label>
                <Input
                  id="x_link"
                  placeholder="https://x.com/janedoe"
                  value={xLink}
                  onChange={(e) => setXLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  placeholder="https://github.com/janedoe"
                  value={githubLink}
                  onChange={(e) => setGithubLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/janedoe"
                  value={linkedinLink}
                  onChange={(e) => setLinkedinLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  placeholder="https://youtube.com/@janedoe"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/janedoe"
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/janedoe"
                  value={facebookLink}
                  onChange={(e) => setFacebookLink(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinterest">Pinterest</Label>
                <Input
                  id="pinterest"
                  placeholder="https://pinterest.com/janedoe"
                  value={pinterestLink}
                  onChange={(e) => setPinterestLink(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-destructive/30 bg-destructive/[0.02]">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently remove this author profile from your publication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-background p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Delete this author</p>
                <p className="text-xs text-muted-foreground">
                  {totalAuthorsCount > 1
                    ? `Their articles (${author.blog_count ?? 0} posts) will be reassigned to your primary author.`
                    : "You must have at least one author in your publication. Create another author before deleting this one."}
                </p>
              </div>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={totalAuthorsCount <= 1 || submitting || deleting}
                className="shrink-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Author
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" asChild disabled={submitting}>
            <Link href="/dashboard/authors">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting || !isDirty || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Author</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{author.name}&quot;? Their articles ({author.blog_count ?? 0} {author.blog_count === 1 ? "post" : "posts"}) will automatically be reassigned to your primary author.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Author"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
