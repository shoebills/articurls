import Link from "next/link";
import { Pin } from "lucide-react";
import type { PublicBlog, Category } from "@/lib/types";
import { getPublicPostUrl } from "@/lib/public-url";
import { resolveBlogCoverImage } from "@/lib/blog-images";

export type PublicPostCardProps = {
  blog: PublicBlog;
  subdomain: string;
  basePath?: string;
  category?: Category | null;
  authorName?: string;
  showPreview?: boolean;
  variant?: "card" | "row" | "compact";
};

export function PublicPostCard({
  blog: b,
  subdomain,
  basePath = "",
  category,
  authorName,
  showPreview = true,
  variant = "card",
}: PublicPostCardProps) {
  const postHref = getPublicPostUrl(subdomain, b.slug, basePath);
  const coverImg = resolveBlogCoverImage(b);
  const authorDisplay = authorName || (b.author ? b.author.name : "");

  if (variant === "compact") {
    return (
      <Link
        href={postHref}
        className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
      >
        <div>
          {coverImg ? (
            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImg}
                alt={b.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : null}
          <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {b.title}
          </h4>
        </div>
        {b.published_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            {new Date(b.published_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <Link
        href={postHref}
        className="group block py-6 border-b border-border/40 last:border-0 transition-colors"
      >
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            {category ? (
              <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 inline-block">
                {category.name}
              </span>
            ) : null}
            <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
              {b.is_pinned && (
                <span title="Pinned post" className="inline-flex shrink-0">
                  <Pin className="h-4 w-4 text-primary rotate-45" />
                </span>
              )}
              <span>{b.title}</span>
            </h3>
            {showPreview && b.excerpt ? (
              <p className="text-muted-foreground text-sm line-clamp-2 mt-2">
                {b.excerpt}
              </p>
            ) : null}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
              <span className="truncate">{authorDisplay}</span>
              {b.published_at && (
                <time dateTime={b.published_at} className="shrink-0 ml-2">
                  {new Date(b.published_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              )}
            </div>
          </div>
          {coverImg ? (
            <div className="shrink-0 w-24 sm:w-56 overflow-hidden rounded-xl border border-border/70 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImg}
                alt={b.title}
                className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  // Default: "card"
  return (
    <Link
      href={postHref}
      className="group flex flex-col h-full bg-card rounded-2xl border border-border/70 overflow-hidden hover:border-primary/50 transition-all shadow-2xs hover:shadow-sm"
    >
      {coverImg ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImg}
            alt={b.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className="p-6 flex flex-col flex-1">
        {category ? (
          <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            {category.name}
          </span>
        ) : null}
        <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
          {b.is_pinned && (
            <span title="Pinned post" className="inline-flex shrink-0">
              <Pin className="h-4 w-4 text-primary rotate-45" />
            </span>
          )}
          <span>{b.title}</span>
        </h3>
        {showPreview && b.excerpt ? (
          <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
            {b.excerpt}
          </p>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border/40">
          <span className="truncate">{authorDisplay}</span>
          {b.published_at && (
            <time dateTime={b.published_at} className="shrink-0 ml-2">
              {new Date(b.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
        </div>
      </div>
    </Link>
  );
}
