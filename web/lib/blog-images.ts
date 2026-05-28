import { assetUrl } from "@/lib/env";
import { transformImageUrl } from "./image-transform";
import type { BlogListItem, PublicBlog } from "@/lib/types";

function firstImageFromHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || null;
}

type BlogLike = Pick<BlogListItem, "featured_image_url" | "content"> | Pick<PublicBlog, "featured_image_url" | "content">;

export function resolveBlogPreviewImage(blog: BlogLike): string {
  const explicit = blog.featured_image_url ? assetUrl(blog.featured_image_url) : "";
  if (explicit) return transformImageUrl(explicit, { width: 800 });
  const fromContent = assetUrl(firstImageFromHtml(blog.content));
  if (fromContent) return transformImageUrl(fromContent, { width: 800 });
  return "";
}
