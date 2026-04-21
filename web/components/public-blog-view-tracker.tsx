"use client";

import { useEffect } from "react";
import { API_URL, APP_ORIGIN } from "@/lib/env";

type PublicBlogViewTrackerProps = {
  userName: string;
  slug: string;
};

export function PublicBlogViewTracker({ userName, slug }: PublicBlogViewTrackerProps) {
  useEffect(() => {
    const key = `viewed:${userName}:${slug}`;
    if (sessionStorage.getItem(key)) return;

    const referrer = document.referrer;
    if (referrer) {
      try {
        const ref = new URL(referrer);
        const app = new URL(APP_ORIGIN);
        if (ref.hostname === app.hostname) {
          sessionStorage.setItem(key, "1");
          return;
        }
      } catch {
        // Ignore malformed referrer and continue tracking.
      }
    }

    const token = localStorage.getItem("articurls_token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_URL}/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers,
      keepalive: true,
    })
      .then(() => {
        sessionStorage.setItem(key, "1");
      })
      .catch(() => {
        // Ignore tracking failures; page rendering should not be affected.
      });
  }, [slug, userName]);

  return null;
}
