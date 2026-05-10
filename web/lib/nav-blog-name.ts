import { cn } from "@/lib/utils";

export type NavBlogNameSize = "small" | "medium" | "large";

/** Matches unknown API values to a safe size; default medium for new and legacy users. */
export function normalizeNavBlogNameSize(raw: string | null | undefined): NavBlogNameSize {
  if (raw === "small" || raw === "large") return raw;
  return "medium";
}

/** Typography: small = same steps as "Featured" heading; each step bumps one text size on both breakpoints. */
const SIZE_CLASSES: Record<NavBlogNameSize, string> = {
  small: "text-xl font-bold tracking-tight sm:text-2xl",
  medium: "text-2xl font-bold tracking-tight sm:text-3xl",
  large: "text-3xl font-bold tracking-tight sm:text-4xl",
};

/** League Spartan + responsive size (see globals.css `.font-nav-blog-name`). */
export function navBlogNameClassName(size: NavBlogNameSize, extra?: string): string {
  return cn(
    "font-nav-blog-name leading-[1.12] sm:leading-tight",
    SIZE_CLASSES[size],
    extra
  );
}

const NAV_TITLE_ROW = "flex min-h-9 items-center hover:underline";

/** Mobile public nav title — must stay in sync with {@link publicNavDesktopBlogTitleClassName}. */
export function publicNavMobileBlogTitleClassName(size: NavBlogNameSize): string {
  return cn(NAV_TITLE_ROW, navBlogNameClassName(size, "min-w-0 flex-1 truncate"));
}

/** Desktop inline nav title — same min-h-9 + items-center as mobile; width rules for centered cluster layout. */
export function publicNavDesktopBlogTitleClassName(size: NavBlogNameSize): string {
  return cn(
    NAV_TITLE_ROW,
    "min-w-0 max-w-full shrink-0 truncate",
    navBlogNameClassName(size),
  );
}
