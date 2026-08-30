"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createSite, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FloatingErrorToast } from "@/components/floating-error-toast";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Globe, Plus, Sparkles } from "lucide-react";
import slugify from "slugify";

export function SiteSwitcher({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { token, sites, activeSite, switchSite, refreshSites } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [siteName, setSiteName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const cleanSubdomain = slugify(subdomain.trim(), { lower: true, strict: true });
    if (!cleanSubdomain || cleanSubdomain.length < 3) {
      setError("Subdomain must be at least 3 characters");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newSite = await createSite(token, {
        subdomain: cleanSubdomain,
        nav_blog_name: siteName.trim() || undefined,
      });
      setCreateOpen(false);
      setSubdomain("");
      setSiteName("");
      await refreshSites();
      await switchSite(newSite.site_id);
      onNavigate?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create site");
    } finally {
      setSubmitting(false);
    }
  };

  const currentDisplayName = activeSite?.nav_blog_name || activeSite?.subdomain || "My Site";

  return (
    <>
      <div className={cn("p-2.5 pb-1", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex h-12 w-full items-center justify-between gap-2 border-sidebar-border/70 bg-background px-3 py-2 text-left shadow-2xs hover:bg-sidebar-accent/50"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-sm">
                  {currentDisplayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground leading-tight">
                    {currentDisplayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground leading-tight">
                    {activeSite?.custom_domain || `${activeSite?.subdomain || ""}.articurls.site`}
                  </p>
                </div>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1.5 shadow-lg">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Sites ({sites.length})
            </DropdownMenuLabel>
            {sites.map((site) => {
              const isSelected = activeSite?.site_id === site.site_id;
              const name = site.nav_blog_name || site.subdomain;
              return (
                <DropdownMenuItem
                  key={site.site_id}
                  onClick={() => {
                    if (!isSelected) {
                      switchSite(site.site_id);
                      onNavigate?.();
                    }
                  }}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 cursor-pointer"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Globe className="h-4 w-4 shrink-0 opacity-70" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {site.custom_domain || `${site.subdomain}.articurls.site`}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-2.5 py-2 text-sm font-medium cursor-pointer text-primary focus:text-primary"
            >
              <Plus className="h-4 w-4" />
              Create New Site
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && <FloatingErrorToast message={error} onDismiss={() => setError(null)} />}

      {/* Create New Site Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Create New Site
            </DialogTitle>
            <DialogDescription>
              Launch a separate publication with its own branding, theme, domain, and posts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSite} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-subdomain">Site Subdomain *</Label>
              <div className="flex items-center rounded-md border bg-muted/30 px-3">
                <input
                  id="new-subdomain"
                  className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                  placeholder="my-tech-blog"
                  value={subdomain}
                  onChange={(e) => setSubdomain(slugify(e.target.value, { lower: true, strict: true }))}
                  required
                />
                <span className="text-xs text-muted-foreground select-none">.articurls.site</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                This cannot be changed later, but you can connect a custom domain anytime.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-sitename">Site Name (Optional)</Label>
              <Input
                id="new-sitename"
                placeholder="e.g. My Tech Blog"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Site"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
