"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listAuthors,
  deleteAuthor,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Author } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
  BookOpen,
  Loader2,
  BriefcaseBusiness,
} from "lucide-react";

export default function AuthorsPage() {
  const { token } = useAuth();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [authorToDelete, setAuthorToDelete] = useState<Author | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!token || !authorToDelete) return;
    setDeleting(true);
    setError(null);

    try {
      await deleteAuthor(token, authorToDelete.author_id);
      setDeleteConfirmOpen(false);
      setAuthorToDelete(null);
      await fetchAuthors();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete author");
    } finally {
      setDeleting(false);
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
        <Button asChild className="gap-2">
          <Link href="/dashboard/authors/new">
            <Plus className="h-4 w-4" />
            Add Author
          </Link>
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
          <Button asChild className="mt-5 gap-2">
            <Link href="/dashboard/authors/new">
              <Plus className="h-4 w-4" />
              Add First Author
            </Link>
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
                    <Link
                      href={`/dashboard/authors/${author.author_id}/edit`}
                      className="flex items-center gap-3 min-w-0 group-hover:opacity-90 transition-opacity"
                    >
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
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {author.name}
                        </h3>
                        {author.occupation ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <BriefcaseBusiness className="h-3 w-3 shrink-0" />
                            <span className="truncate">{author.occupation}</span>
                          </p>
                        ) : (
                          <div className="h-[1rem]" aria-hidden />
                        )}
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/authors/${author.author_id}/edit`} className="gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                          </Link>
                        </DropdownMenuItem>
                        {authors.length > 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setAuthorToDelete(author);
                                setDeleteConfirmOpen(true);
                              }}
                              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
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
                        title="Website"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Author</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{authorToDelete?.name}&quot;? Their articles ({authorToDelete?.blog_count ?? 0} {authorToDelete?.blog_count === 1 ? "post" : "posts"}) will automatically be reassigned to your primary author.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
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
