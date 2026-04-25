import { DEFAULT_BLOG_FEATURED_IMAGE_URL, assetUrl } from "@/lib/env";
import type { BlogListItem, PublicBlog } from "@/lib/types";

function firstImageFromHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || null;
}

type BlogLike = Pick<BlogListItem, "featured_image_url" | "content"> | Pick<PublicBlog, "featured_image_url" | "content">;

export function resolveBlogPreviewImage(blog: BlogLike, useDefaultFallback = true): string {
  const explicit = blog.featured_image_url ? assetUrl(blog.featured_image_url) : "";
  if (explicit) return explicit;
  const fromContent = assetUrl(firstImageFromHtml(blog.content));
  if (fromContent) return fromContent;
  return useDefaultFallback ? DEFAULT_BLOG_FEATURED_IMAGE_URL : "";
}
