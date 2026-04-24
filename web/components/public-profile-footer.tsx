import type { PublicUser } from "@/lib/types";
import { assetUrl } from "@/lib/env";
import { VerifiedBadge } from "@/components/verified-badge";
import { MdOutlineEmail } from "react-icons/md";
import { SiFacebook, SiGithub, SiInstagram, SiPinterest, SiX, SiYoutube } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";

function normalizePublicLink(link: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link}`;
}

function socialItems(user: PublicUser) {
  return [
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

export function PublicProfileFooter({ user }: { user: PublicUser }) {
  if (!user.footer_enabled) return null;

  return (
    <section className="mt-12 border-t border-border/80 pt-8">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">About the author</h2>
      <div className="flex items-center gap-3">
        {user.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(user.profile_image_url)} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border/70" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted ring-1 ring-border/70" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold leading-tight">
            <span className="min-w-0 break-words">{user.name}</span>
            {user.verification_tick ? <VerifiedBadge /> : null}
          </p>
        </div>
      </div>

      {user.bio ? <p className="mt-5 whitespace-pre-line text-base text-muted-foreground">{user.bio}</p> : null}

      {user.link ? (
        <p className="mt-5">
          <a
            href={normalizePublicLink(user.link)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            {user.link}
          </a>
        </p>
      ) : null}

      {socialItems(user).length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {socialItems(user).map((item) => {
            const href = item.href as string;
            const isMail = href.startsWith("mailto:");
            return (
              <a
                key={item.key}
                href={isMail ? href : normalizePublicLink(href)}
                target={isMail ? undefined : "_blank"}
                rel={isMail ? undefined : "noreferrer"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/25 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={item.label}
                title={item.label}
              >
                {item.icon}
              </a>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
