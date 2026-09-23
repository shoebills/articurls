"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Globe, Plus } from "lucide-react";

export function SiteSwitcher({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { sites, activeSite, switchSite } = useAuth();

  const currentDisplayName = activeSite?.site_name || activeSite?.subdomain || "My Site";

  return (
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
            const name = site.site_name || site.subdomain;
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
            onClick={() => {
              onNavigate?.();
              router.push("/setup");
            }}
            className="flex items-center gap-2 px-2.5 py-2 text-sm font-medium cursor-pointer text-primary focus:text-primary"
          >
            <Plus className="h-4 w-4" />
            Create New Site
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
