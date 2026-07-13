import { NextRequest, NextResponse } from "next/server";
import { API_URL, UGS_ORIGIN } from "@/lib/env";
import type { PublicUser } from "@/lib/types";
import { buildRssXml, fetchPublishedPosts, fetchSeoEligibility, type RssItem } from "@/lib/seo-data";

export const dynamic = "force-dynamic";

const MAX_RSS_ITEMS = 100;

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

function resolveUsernameParam(params: Record<string, string | string[] | undefined>): string | null {
  const direct = params.username;
  if (typeof direct === "string" && direct.trim()) return direct;
  const firstString = Object.values(params).find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return firstString ?? null;
}

async function loadUser(username: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_URL}/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicUser;
  } catch {
    return null;
  }
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<Response> {
  const routeParams = await params;
  const username = resolveUsernameParam(routeParams);
  if (!username) return new NextResponse(null, { status: 404 });

  const user = await loadUser(username);
  if (!user) return new NextResponse(null, { status: 404 });
  if (user.rss_enabled === false) return new NextResponse(null, { status: 404 });

  const canonicalUsername = user.user_name || username;
  const seoEligibility = await fetchSeoEligibility(canonicalUsername);
  if (!seoEligibility?.can_index_on_ugc) return new NextResponse(null, { status: 404 });

  const posts = await fetchPublishedPosts(canonicalUsername);
  const sorted = [...posts].sort(
    (a, b) => toTimestamp(b.published_at || b.updated_at) - toTimestamp(a.published_at || a.updated_at),
  );
  const items: RssItem[] = sorted.slice(0, MAX_RSS_ITEMS).map((post) => {
    const link = `${UGS_ORIGIN}/${encodeURIComponent(canonicalUsername)}/blog/${encodeURIComponent(post.slug)}`;
    return {
      title: post.title || "Untitled post",
      link,
      guid: link,
      pubDate: post.published_at || post.updated_at,
      description: post.meta_description || post.excerpt || "",
    };
  });

  const siteLink = `${UGS_ORIGIN}/${encodeURIComponent(canonicalUsername)}`;
  const xml = buildRssXml({
    title: user.meta_title || `${user.name} — Articurls`,
    link: siteLink,
    description: user.meta_description || `Latest posts by ${user.name}.`,
    lastBuildDate: sorted[0]?.updated_at || sorted[0]?.published_at || null,
    items,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
