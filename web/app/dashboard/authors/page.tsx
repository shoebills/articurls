"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  listAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  uploadAuthorAvatar,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Author } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { assetUrl } from "@/lib/env";
import {
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Globe,
  Mail,
  Upload,
  BookOpen,
} from "lucide-react";
import slugify from "slugify";

export default function AuthorsPage() {
  const { token } = useAuth();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [authorToDelete, setAuthorToDelete] = useState<Author | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAuthors = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await listAuthors(token);
      setAuthors(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load authors");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  const openAddDialog = () => {
    setEditingAuthor(null);
    setName("");
    setSlug("");
    setBio("");
    setContactEmail("");
    setWebsiteLink("");
    setXLink("");
    setGithubLink("");
    setLinkedinLink("");
    setYoutubeLink("");
    setInstagramLink("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setDialogOpen(true);
  };

  const openEditDialog = (author: Author) => {
    setEditingAuthor(author);
    setName(author.name);
    setSlug(author.slug);
    setBio(author.bio || "");
    setContactEmail(author.contact_email || "");
    setWebsiteLink(author.website_link || "");
    setXLink(author.x_link || "");
    setGithubLink(author.github_link || "");
    setLinkedinLink(author.linkedin_link || "");
    setYoutubeLink(author.youtube_link || "");
    setInstagramLink(author.instagram_link || "");
    setAvatarFile(null);
    setAvatarPreview(author.profile_image_url ? assetUrl(author.profile_image_url) : null);
    setDialogOpen(true);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim()) {
      setError("Author name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Author> & { name: string } = {
        name: name.trim(),
        slug: slug.trim() || slugify(name.trim(), { lower: true, strict: true }),
        bio: bio.trim() || null,
        contact_email: contactEmail.trim() || null,
        website_link: websiteLink.trim() || null,
        x_link: xLink.trim() || null,
        github_link: githubLink.trim() || null,
        linkedin_link: linkedinLink.trim() || null,
        youtube_link: youtubeLink.trim() || null,
        instagram_link: instagramLink.trim() || null,
      };

      let savedAuthor: Author;
      if (editingAuthor) {
        savedAuthor = await updateAuthor(token, editingAuthor.author_id, payload);
      } else {
        savedAuthor = await createAuthor(token, payload);
      }

      // If a new avatar file was selected, upload it
      if (avatarFile) {
        await uploadAuthorAvatar(token, savedAuthor.author_id, avatarFile);
      }

      setDialogOpen(false);
      await fetchAuthors();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save author");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !authorToDelete) return;
    setSubmitting(true);
    setError(null);

    try {
      await deleteAuthor(token, authorToDelete.author_id);
      setDeleteConfirmOpen(false);
      setAuthorToDelete(null);
      await fetchAuthors();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete author");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Authors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage writers and contributors for your publication.
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Author
        </Button>
      </div>

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}

      {/* Authors List */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : authors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold">No authors found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Add authors to assign bylines and generate individual profile pages.
          </p>
          <Button onClick={openAddDialog} className="mt-5 gap-2">
            <Plus className="h-4 w-4" />
            Add First Author
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => {
            const avatarSrc = author.profile_image_url ? assetUrl(author.profile_image_url) : null;
            return (
              <div
                key={author.author_id}
                className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-2xs hover:shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt={author.name}
                          className="h-12 w-12 rounded-full object-cover border border-border/80 shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                          {author.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{author.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          /author/{author.slug}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(author)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        {authors.length > 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setAuthorToDelete(author);
                                setDeleteConfirmOpen(true);
                              }}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Author
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {author.bio && (
                    <p className="mt-4 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {author.bio}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{author.blog_count ?? 0} {author.blog_count === 1 ? "post" : "posts"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {author.website_link && (
                      <a
                        href={author.website_link}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {author.contact_email && (
                      <a
                        href={`mailto:${author.contact_email}`}
                        className="hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAuthor ? "Edit Author" : "Add New Author"}</DialogTitle>
            <DialogDescription>
              {editingAuthor
                ? "Update author bio, avatar, and social links."
                : "Create a new author profile to assign articles to."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-xl">
                  {name ? name.slice(0, 1).toUpperCase() : "?"}
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {avatarPreview ? "Change Avatar" : "Upload Avatar"}
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG or WebP up to 2MB</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author-name">Full Name *</Label>
              <Input
                id="author-name"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingAuthor && !slug) {
                    setSlug(slugify(e.target.value, { lower: true, strict: true }));
                  }
                }}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author-slug">URL Slug</Label>
              <div className="flex items-center rounded-md border bg-muted/30 px-3">
                <span className="text-xs text-muted-foreground select-none">/author/</span>
                <input
                  id="author-slug"
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                  placeholder="jane-doe"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value, { lower: true, strict: true }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author-bio">Bio</Label>
              <Textarea
                id="author-bio"
                placeholder="Short bio or introduction..."
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author-email">Contact Email</Label>
              <Input
                id="author-email"
                type="email"
                placeholder="author@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Social Links & Website
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="link-website" className="text-xs">Website URL</Label>
                  <Input
                    id="link-website"
                    placeholder="https://janedoe.com"
                    value={websiteLink}
                    onChange={(e) => setWebsiteLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="link-x" className="text-xs">X / Twitter</Label>
                  <Input
                    id="link-x"
                    placeholder="https://x.com/janedoe"
                    value={xLink}
                    onChange={(e) => setXLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="link-github" className="text-xs">GitHub</Label>
                  <Input
                    id="link-github"
                    placeholder="https://github.com/janedoe"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="link-linkedin" className="text-xs">LinkedIn</Label>
                  <Input
                    id="link-linkedin"
                    placeholder="https://linkedin.com/in/janedoe"
                    value={linkedinLink}
                    onChange={(e) => setLinkedinLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="link-youtube" className="text-xs">YouTube</Label>
                  <Input
                    id="link-youtube"
                    placeholder="https://youtube.com/@janedoe"
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="link-instagram" className="text-xs">Instagram</Label>
                  <Input
                    id="link-instagram"
                    placeholder="https://instagram.com/janedoe"
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingAuthor ? "Save Changes" : "Create Author"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Author</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{authorToDelete?.name}&quot;? Their blog posts will automatically be reassigned to your primary author.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Author"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
