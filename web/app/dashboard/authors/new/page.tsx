"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAuthor, uploadAuthorAvatar, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { ChevronLeft, Loader2, Upload, UserRound, X } from "lucide-react";
import slugify from "slugify";
import type { Author } from "@/lib/types";

export default function NewAuthorPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugCustomized, setSlugCustomized] = useState(false);
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugCustomized) {
      setSlug(slugify(val, { lower: true, strict: true }));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugCustomized(true);
    setSlug(slugify(val, { lower: true, strict: true }));
  };

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

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Author name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const finalSlug = slug.trim() || slugify(trimmedName, { lower: true, strict: true });
      const payload: Partial<Author> & { name: string } = {
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

      const created = await createAuthor(token, payload);

      if (avatarFile) {
        try {
          await uploadAuthorAvatar(token, created.author_id, avatarFile);
        } catch {
          // Continue to redirect even if avatar upload had a secondary issue
        }
      }

      router.push("/dashboard/authors");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create author");
      setSubmitting(false);
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New Author</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a new author profile to assign articles and bylines to.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" asChild disabled={submitting}>
            <Link href="/dashboard/authors">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Author"
            )}
          </Button>
        </div>
      </div>

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}

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
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        className="gap-1.5 text-muted-foreground hover:text-destructive"
                        disabled={submitting}
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
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
                  onChange={(e) => handleNameChange(e.target.value)}
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
                    onChange={(e) => handleSlugChange(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The URL path where the author profile will be accessible.
                </p>
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
              <p className="text-xs text-muted-foreground">
                Displayed at the end of articles and on the author profile page.
              </p>
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
              <p className="text-xs text-muted-foreground">
                Optional email shown on the public author page.
              </p>
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

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" asChild disabled={submitting}>
            <Link href="/dashboard/authors">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Author...
              </>
            ) : (
              "Create Author"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
