"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  CornerUpRight,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ApiError,
  createRedirect,
  deleteRedirect,
  listRedirects,
  updateRedirect,
} from "@/lib/api";
import type { RedirectRule } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FloatingErrorToast } from "@/components/floating-error-toast";

const SOFT_LIMIT = 200;

type FormState = {
  source_path: string;
  target_url: string;
  type: "permanent" | "temporary";
};

const EMPTY_FORM: FormState = { source_path: "", target_url: "", type: "permanent" };

function validateForm(form: FormState): string | null {
  const source = form.source_path.trim();
  const target = form.target_url.trim();
  if (!source.startsWith("/")) {
    return "Source must be a path starting with '/', e.g. /my-old-post.";
  }
  if (!target.startsWith("/") && !/^https?:\/\//.test(target)) {
    return "Target must be a path like /my-new-post or a full https:// URL.";
  }
  if (source === target) {
    return "Source and target must be different.";
  }
  return null;
}

export default function RedirectsSettingsPage() {
  const { token } = useAuth();

  const [redirects, setRedirects] = useState<RedirectRule[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RedirectRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RedirectRule | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await listRedirects(token);
        setRedirects(data);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Failed to load redirects");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(rule: RedirectRule) {
    setEditing(rule);
    setForm({
      source_path: rule.source_path,
      target_url: rule.target_url,
      type: rule.type,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSave() {
    if (!token) return;
    const validation = validateForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const body = {
        source_path: form.source_path.trim(),
        target_url: form.target_url.trim(),
        type: form.type,
      };
      if (editing) {
        const updated = await updateRedirect(token, editing.redirect_id, body);
        setRedirects((list) =>
          (list ?? []).map((r) => (r.redirect_id === updated.redirect_id ? updated : r))
        );
        setSavedMsg("Redirect updated");
      } else {
        const created = await createRedirect(token, body);
        setRedirects((list) => [created, ...(list ?? [])]);
        setSavedMsg("Redirect added");
      }
      setDialogOpen(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Failed to save redirect");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    setErr(null);
    try {
      await deleteRedirect(token, deleteTarget.redirect_id);
      setRedirects((list) => (list ?? []).filter((r) => r.redirect_id !== deleteTarget.redirect_id));
      setSavedMsg("Redirect deleted");
      setDeleteTarget(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete redirect");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Top navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Redirects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send visitors from old URLs to new ones. Redirects are checked before content, so old links keep working.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add redirect
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ) : (redirects ?? []).length === 0 ? (
        <div
          className="flex min-h-[220px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dotted border-border bg-background px-6 py-14 text-center"
          role="status"
          aria-label="No redirects yet"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/60">
            <CornerUpRight className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-base font-medium text-foreground">No redirects yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add a redirect when you change a URL so old links and search results keep working.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(redirects ?? []).length >= SOFT_LIMIT && (
            <p className="text-xs text-muted-foreground">
              You have {(redirects ?? []).length} redirects. Large redirect lists can slow down your site&apos;s first load after changes.
            </p>
          )}
          <div className="space-y-2">
            {(redirects ?? []).map((rule) => (
              <div
                key={rule.redirect_id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                  <span className="truncate font-mono text-sm text-foreground">
                    {rule.source_path}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-mono text-sm text-muted-foreground">
                    {rule.target_url}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={rule.type === "permanent" ? "secondary" : "outline"}>
                    {rule.type === "permanent" ? "Permanent" : "Temporary"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Actions for redirect ${rule.source_path}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteTarget(rule)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-md rounded-2xl sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit redirect" : "Add redirect"}</DialogTitle>
            <DialogDescription>
              Redirects apply to your publication&apos;s public pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="redirect_source">Source path</Label>
              <Input
                id="redirect_source"
                className="mt-2 font-mono"
                placeholder="/my-old-post"
                maxLength={300}
                value={form.source_path}
                onChange={(e) => setForm({ ...form, source_path: e.target.value })}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                The old URL path to redirect from. Trailing slashes are ignored.
              </p>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="redirect_target">Target</Label>
              <Input
                id="redirect_target"
                className="mt-2 font-mono"
                placeholder="/my-new-post"
                maxLength={2000}
                value={form.target_url}
                onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                A path on your site like /my-new-post, or a full https:// URL.
              </p>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="redirect_type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value as FormState["type"] })}
                disabled={busy}
              >
                <SelectTrigger id="redirect_type" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Permanent tells search engines to update their index. Temporary keeps the old URL indexed.
              </p>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save Changes" : "Add Redirect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl sm:max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete redirect?</DialogTitle>
            <DialogDescription>
              Visitors opening {deleteTarget?.source_path} will no longer be redirected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteBusy} className="gap-2">
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
      {!err && (
        <FloatingErrorToast
          message={savedMsg}
          onDismiss={() => setSavedMsg(null)}
          autoDismissMs={3000}
          variant="success"
        />
      )}
    </div>
  );
}
