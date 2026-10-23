import Link from "next/link";
import type { Category } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { getPublicCategoryUrl } from "@/lib/public-url";
import { cn } from "@/lib/utils";

const categoryBadgeClass =
  "shrink-0 rounded-full border-transparent bg-primary/10 text-primary shadow-none hover:bg-primary/15";

export type PublicCategoryBadgesProps = {
  categories: Category[];
  subdomain?: string;
  basePath?: string;
  className?: string;
};

export function PublicCategoryBadges({
  categories,
  subdomain,
  basePath = "",
  className,
}: PublicCategoryBadgesProps) {
  if (categories.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {categories.map((category) =>
        subdomain ? (
          <Link key={category.category_id} href={getPublicCategoryUrl(subdomain, category.slug, basePath)}>
            <Badge className={categoryBadgeClass}>{category.name}</Badge>
          </Link>
        ) : (
          <Badge key={category.category_id} className={categoryBadgeClass}>
            {category.name}
          </Badge>
        )
      )}
    </div>
  );
}
