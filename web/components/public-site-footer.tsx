import Link from "next/link";
import type { PublicUser, UserPage } from "@/lib/types";

type PublicSiteFooterProps = {
  user: PublicUser;
  pages: UserPage[];
};

export function PublicSiteFooter({ user, pages }: PublicSiteFooterProps) {
  if (!user.site_footer_enabled) return null;

  const footerPages = [...pages]
    .filter((p) => p.show_in_footer)
    .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999));

  if (footerPages.length === 0) return null;

  return (
    <footer className="mt-12 border-t border-border/80 pt-8">
      <nav aria-label="Footer links">
        <ul className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-y-2 text-sm">
          {footerPages.map((page) => (
            <li key={page.page_id} className="w-1/3 px-1 text-center sm:w-1/5 sm:px-2">
              <Link
                href={`/${encodeURIComponent(user.user_name)}/page/${encodeURIComponent(page.slug)}`}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                {page.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
