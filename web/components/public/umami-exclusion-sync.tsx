"use client";

import { useEffect } from "react";

/**
 * Plants/removes Umami's official per-browser opt-out flag (`umami.disabled`)
 * on this site origin. The dashboard cannot write another origin's
 * localStorage, so the dashboard toggle opens the public site with a one-time
 * `?exclude-me=1` / `?include-me=1` param and this component applies it, then
 * strips the param so it never leaks into shared URLs or analytics.
 */
export function UmamiExclusionSync() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("exclude-me")) {
        window.localStorage.setItem("umami.disabled", "1");
      } else if (url.searchParams.has("include-me")) {
        window.localStorage.removeItem("umami.disabled");
      } else {
        return;
      }
      url.searchParams.delete("exclude-me");
      url.searchParams.delete("include-me");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // Storage unavailable (e.g. private mode) — tracking continues as normal.
    }
  }, []);
  return null;
}
