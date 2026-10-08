"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSitePublicRoot } from "@/lib/public-url";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EyeOff } from "lucide-react";

function storageKey(siteId: string): string {
  return `articurls:exclude-visits:${siteId}`;
}

/**
 * Per-browser self-exclusion from site analytics. Umami honors a
 * `umami.disabled` localStorage flag on the site origin, but the dashboard
 * (app host) cannot write another origin's storage — so flipping the switch
 * opens the site's public URL once with a one-time param that plants/removes
 * the flag there (see UmamiExclusionSync). Applies to this browser only.
 */
export function ExcludeVisitsToggle() {
  const { activeSite } = useAuth();
  const siteId = activeSite?.site_id ?? null;
  const [excluded, setExcluded] = useState(false);

  useEffect(() => {
    if (!siteId) return;
    try {
      // Sync from browser storage (external system) once the active site is known.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExcluded(localStorage.getItem(storageKey(siteId)) === "1");
    } catch {
      setExcluded(false);
    }
  }, [siteId]);

  const root = getSitePublicRoot(activeSite);

  function openWithParam(param: "exclude-me" | "include-me") {
    if (!root) return;
    const sep = root.includes("?") ? "&" : "?";
    window.open(`${root}${sep}${param}=1`, "_blank", "noopener");
  }

  function onCheckedChange(next: boolean) {
    if (!siteId) return;
    try {
      if (next) {
        localStorage.setItem(storageKey(siteId), "1");
      } else {
        localStorage.removeItem(storageKey(siteId));
      }
    } catch {
      // Private mode etc. — still attempt the site-side handoff below.
    }
    setExcluded(next);
    openWithParam(next ? "exclude-me" : "include-me");
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4 sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <EyeOff className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium">Exclude my visits on this browser</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Stops counting your own visits in analytics on this browser. Your site opens once to apply it.
          </p>
        </div>
        <Switch
          checked={excluded}
          onCheckedChange={onCheckedChange}
          disabled={!root}
          aria-label="Exclude my visits on this browser"
          className="shrink-0"
        />
      </CardContent>
    </Card>
  );
}
