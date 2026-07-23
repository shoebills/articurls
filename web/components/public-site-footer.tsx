import Link from "next/link";
import type { PublicUser, UserPage } from "@/lib/types";
import { getPublicPageUrl } from "@/lib/public-url";
import { MdOutlineEmail } from "react-icons/md";
import { SiFacebook, SiGithub, SiInstagram, SiPinterest, SiX, SiYoutube } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import { Link, Rss } from "lucide-react";

type PublicSiteFooterProps = {
  user: PublicUser;
  pages: UserPage[];
  useCustomDomain?: boolean;
};

function normalizePublicLink(link: string): string {
  if (link.startsWith("/")) return link;
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link}`;
}

function socialItems(user: PublicUser, useCustomDomain: boolean) {
  const showRss = Boolean(user.rss_enabled);
  const rssHref = useCustomDomain
    ? "/rss.xml"
    : `/${encodeURIComponent(user.user_name)}/rss.xml`;
  return [
    { key: "website", href: user.website_link, label: "Website", icon: <Link className="h-4 w-4" aria-hidden /> },
    {
      key: "rss",
      href: showRss ? rssHref : null,
      label: "RSS feed",
      icon: <Rss className="h-[17px] w-[17px]" strokeWidth={2.4} aria-hidden />,
    },
    { key: "contact_email", href: user.contact_email ? `mailto:${user.contact_email}` : null, label: "Email", icon: <MdOutlineEmail className="h-4 w-4" aria-hidden /> },
    { key: "instagram", href: user.instagram_link, label: "Instagram", icon: <SiInstagram className="h-4 w-4" aria-hidden /> },
    { key: "x", href: user.x_link, label: "X (Twitter)", icon: <SiX className="h-4 w-4" aria-hidden /> },
    { key: "pinterest", href: user.pinterest_link, label: "Pinterest", icon: <SiPinterest className="h-4 w-4" aria-hidden /> },
    { key: "facebook", href: user.facebook_link, label: "Facebook", icon: <SiFacebook className="h-4 w-4" aria-hidden /> },
    { key: "linkedin", href: user.linkedin_link, label: "LinkedIn", icon: <FaLinkedinIn className="h-4 w-4" aria-hidden /> },
    { key: "github", href: user.github_link, label: "GitHub", icon: <SiGithub className="h-4 w-4" aria-hidden /> },
    { key: "youtube", href: user.youtube_link, label: "YouTube", icon: <SiYoutube className="h-4 w-4" aria-hidden /> },
  ].filter((item) => item.href && item.href.trim() !== "");
}

export function PublicSiteFooter({ user, pages, useCustomDomain = false }: PublicSiteFooterProps) {
  if (!user.site_footer_enabled) return null;

  const footerPages = [...pages]
    .filter((p) => p.show_in_footer)
    .sort((a, b) => (a.footer_order ?? 9999) - (b.footer_order ?? 9999));
  const socials = socialItems(user, useCustomDomain);

  if (footerPages.length === 0 && socials.length === 0) return null;

  return (
    <footer className="mt-12 border-t border-border/80 pt-8">
      {footerPages.length > 0 ? (
        <nav aria-label="Footer links">
          <ul className="mx-auto flex w-full max-w-4xl flex-wrap justify-center gap-y-2 text-sm">
            {footerPages.map((page) => (
              <li key={page.page_id} className="w-1/3 px-1 text-center sm:w-1/5 sm:px-2">
                <Link
                  href={getPublicPageUrl(user.user_name, page.slug, { customDomain: useCustomDomain })}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {socials.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 sm:mt-7">
          {socials.map((item) => {
            const href = item.href as string;
            const isMail = href.startsWith("mailto:");
            return (
              <a
                key={item.key}
                href={isMail ? href : normalizePublicLink(href)}
                target={isMail ? undefined : "_blank"}
                rel={isMail ? undefined : "noreferrer"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/25 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-10 sm:w-10"
                aria-label={item.label}
                title={item.label}
              >
                {item.icon}
              </a>
            );
          })}
        </div>
      ) : null}
    </footer>
  );
}
