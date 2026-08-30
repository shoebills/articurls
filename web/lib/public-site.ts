import { cache } from "react";
import { API_URL } from "@/lib/env";
import type { PublicSite } from "@/lib/types";

/** Cached public site fetch — shared by layouts and pages within one request. */
export const loadPublicSite = cache(async (subdomain: string): Promise<PublicSite | null> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<PublicSite>;
});
