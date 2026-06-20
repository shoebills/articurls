import { NextRequest } from "next/server";
import { API_URL, MARKETING_ORIGIN } from "@/lib/env";

export const dynamic = "force-dynamic";

type InternalSitemapUser = {
  username: string;
  updated_at?: string | null;
};

function buildSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
  const items = sitemaps
    .map(({ loc, lastmod }) => {
      const parts = [`    <loc>${loc}</loc>`];
      if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
      return `  <sitemap>\n${parts.join("\n")}\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
}

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

async function loadMarketingIndexableUsers(): Promise<InternalSitemapUser[]> {
  try {
    const res = await fetch(`${API_URL}/internal/sitemap-users`, {
      cache: "no-store",
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
    });
    if (!res.ok) return [];
    return (await res.json()) as InternalSitemapUser[];
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest): Promise<Response> {
  const users = await loadMarketingIndexableUsers();
  const sitemaps = users.map((user) => ({
    loc: `${MARKETING_ORIGIN}/sitemaps/${encodeURIComponent(user.username)}/sitemap.xml`,
    lastmod: toIsoDate(user.updated_at),
  }));

  return new Response(buildSitemapIndex(sitemaps), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400",
    },
  });
}
