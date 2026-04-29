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
        <ul className="mx-auto grid w-full max-w-3xl grid-cols-3 justify-items-center gap-2 text-sm sm:grid-cols-5">
          {footerPages.map((page) => (
            <li key={page.page_id} className="w-full text-center">
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
