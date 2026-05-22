import { cache } from "react";
import { API_URL } from "@/lib/env";
import type { PublicUser } from "@/lib/types";

/** Cached public user fetch — shared by layouts and pages within one request. */
export const loadPublicUser = cache(async (username: string): Promise<PublicUser | null> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<PublicUser>;
});
