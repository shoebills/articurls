import Link from "next/link";
import { appAuthHref } from "@/lib/env";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Start for free", href: appAuthHref("/signup?plan=pro") },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
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

export function MarketingFooter() {
  return (
    <>
      <div aria-hidden className="pointer-events-none mx-auto max-w-6xl overflow-hidden px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:px-6">
        <p className="pointer-events-none -mb-[0.25em] block translate-y-[4%] select-none whitespace-nowrap bg-gradient-to-b from-foreground/25 to-transparent bg-clip-text text-center font-bold leading-none tracking-tight text-transparent [font-size:23vw] lg:[font-size:17rem]">
          Articurls
        </p>
      </div>
      <footer className="border-t border-border/70 bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-14 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <p className="text-lg font-semibold text-foreground">Launch, rank &amp; convert.</p>
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
                      className="block py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
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
