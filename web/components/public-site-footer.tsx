import Link from "next/link";
import type { PublicSite, UserPage } from "@/lib/types";
import { getPublicPageUrl } from "@/lib/public-url";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { ExternalLink, Rss } from "lucide-react";

type PublicSiteFooterProps = {
  site: PublicSite;
  pages: UserPage[];
  basePath?: string;
};

function normalizePublicLink(link: string): string {
  if (link.startsWith("/")) return link;
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link}`;
}

export function PublicSiteFooter({ site, pages, basePath = "" }: PublicSiteFooterProps) {
  if (site.site_footer_enabled === false) return null;

  const hasModularColumns = Array.isArray(site.footer_columns) && site.footer_columns.length > 0;
  const showNewsletter = site.footer_newsletter_enabled !== false && site.subscriber_collection_enabled;
  const showSystemLinks = site.footer_system_links_enabled !== false;
  const currentYear = new Date().getFullYear();
  const copyrightText = site.footer_copyright || `© ${currentYear} ${site.name || site.subdomain}. All rights reserved.`;

  return (
    <footer className="mt-20 border-t border-border/80 pt-12 pb-16">
      {hasModularColumns ? (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12 mb-12">
          {/* Brand & Newsletter Column */}
          <div className="space-y-4 lg:col-span-1">
            <h3 className="font-bold text-lg tracking-tight text-foreground">
              {site.nav_blog_name || site.name || "My Blog"}
            </h3>

            {showNewsletter ? (
              <div className="pt-2">
                <p className="text-xs font-medium text-foreground mb-2">Subscribe to newsletter</p>
                <SubscribeToAuthor subdomain={site.subdomain} authorName={site.name} />
              </div>
            ) : null}
          </div>

          {/* Dynamic Link Columns */}
          {site.footer_columns!.map((col) => (
            <div key={col.id} className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.links.map((link) => {
                  const href = link.url.startsWith("/") ? `${basePath}${link.url}` : normalizePublicLink(link.url);
                  const isExternal = link.open_in_new_tab || /^https?:\/\//i.test(link.url);

                  return (
                    <li key={link.id}>
                      <Link
                        href={href}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        <span>{link.label}</span>
                        {isExternal ? <ExternalLink className="h-3 w-3 opacity-60" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        /* Fallback: Standard flat footer page list */
        <div className="mb-8">
          {pages.filter((p) => p.show_in_footer).length > 0 ? (
            <nav aria-label="Footer links">
              <ul className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
                {pages
                  .filter((p) => p.show_in_footer)
                  .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999))
                  .map((page) => (
                    <li key={page.page_id}>
                      <Link
                        href={getPublicPageUrl(site.subdomain, page.slug, basePath)}
                        className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </nav>
          ) : null}
        </div>
      )}

      {/* Bottom Legal & System Links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/40 pt-6">
        <p>{copyrightText}</p>

        {showSystemLinks ? (
          <div className="flex items-center gap-4">
            {site.rss_enabled !== false ? (
              <Link href={`${basePath}/rss.xml`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Rss className="h-3 w-3" />
                <span>RSS</span>
              </Link>
            ) : null}
            <Link href={`${basePath}/sitemaps/posts.xml`} className="hover:text-foreground">
              Sitemap
            </Link>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
