import Link from "next/link";
import { SiGithub, SiX } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import { BrandLogo } from "@/components/brand-logo";
import { appAuthHref, MARKETING_ORIGIN } from "@/lib/env";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: `${MARKETING_ORIGIN}/#features` },
      { label: "How it works", href: `${MARKETING_ORIGIN}/#how-it-works` },
      { label: "Pricing", href: `${MARKETING_ORIGIN}/#pricing` },
      { label: "Start free", href: appAuthHref("/signup") },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Blog examples", href: `${MARKETING_ORIGIN}/#examples` },
      { label: "Log in", href: appAuthHref("/login") },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

const SOCIALS = [
  { label: "GitHub", href: "https://github.com", icon: SiGithub },
  { label: "X", href: "https://x.com", icon: SiX },
  { label: "LinkedIn", href: "https://linkedin.com", icon: FaLinkedinIn },
];

export function MarketingFooter() {
  return (
    <>
      <div aria-hidden className="mx-auto max-w-6xl overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6">
        <p className="-mb-[0.25em] block translate-y-[8%] select-none whitespace-nowrap bg-gradient-to-b from-foreground/25 to-transparent bg-clip-text text-center font-bold leading-none tracking-tighter text-transparent [font-size:23vw] lg:[font-size:17rem]">
          Articurls
        </p>
      </div>
      <footer className="border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-14 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
              A blog you own, on your own domain.
            </p>
            <div className="mt-5 flex items-center gap-1.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                  <s.icon className="h-[1.05rem] w-[1.05rem]" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-1">
              <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-16 text-xs text-muted-foreground/60" suppressHydrationWarning>
          © {new Date().getFullYear()} Articurls
        </p>
      </div>
    </footer>
    </>
  );
}
