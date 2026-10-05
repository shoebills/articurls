import Link from "next/link";
import type { PublicBlog, Category } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { getPublicPostUrl } from "@/lib/public-url";
import { resolveBlogCoverImage } from "@/lib/blog-images";

export type PublicPostCardProps = {
  blog: PublicBlog;
  subdomain: string;
  basePath?: string;
  category?: Category | null;
  categories?: Category[];
  showExcerpt?: boolean;
  large?: boolean;
};

export function PublicPostCard({
  blog: b,
  subdomain,
  basePath = "",
  category,
  categories = [],
  showExcerpt = true,
  large = false,
}: PublicPostCardProps) {
  const postHref = getPublicPostUrl(subdomain, b.slug, basePath);
  const coverImg = resolveBlogCoverImage(b);
  const allCategories =
    b.category_ids && b.category_ids.length > 0 && categories.length > 0
      ? b.category_ids
          .map((id) => categories.find((c) => c.category_id === id))
          .filter((c): c is Category => Boolean(c))
      : category
        ? [category]
        : [];

  // Borderless editorial card
  return (
    <Link
      href={postHref}
      className="group flex flex-col h-full"
    >
      {coverImg ? (
        <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImg}
            alt={b.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : null}
      <div className={large ? "pt-6 flex flex-col flex-1" : "pt-5 flex flex-col flex-1"}>
        <h3 className={large
          ? "text-2xl sm:text-3xl font-bold line-clamp-2 group-hover:text-primary transition-colors"
          : "text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors"
        }>
          <span>{b.title}</span>
        </h3>
        {showExcerpt && b.excerpt ? (
          <p className={large
            ? "text-muted-foreground text-base sm:text-lg line-clamp-3 mt-3 flex-1"
            : "text-muted-foreground text-sm sm:text-base line-clamp-3 mt-2 flex-1"
          }>
            {b.excerpt}
          </p>
        ) : null}

        {!large && (allCategories.length > 0 || b.published_at) ? (
          <div className="flex items-center justify-between gap-2 mt-4">
            {allCategories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {allCategories.map((c) => (
                  <Badge key={c.category_id} className="rounded-full shrink-0 border-transparent bg-primary/10 text-primary shadow-none hover:bg-primary/15">
                    {c.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span />
            )}
            {b.published_at && (
              <time dateTime={b.published_at} className="shrink-0 text-xs text-muted-foreground">
                {new Date(b.published_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
