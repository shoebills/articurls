import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { appAuthHref, MARKETING_ORIGIN } from "@/lib/env";

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-border/80 bg-gradient-to-b from-muted/25 to-muted/40 pb-[env(safe-area-inset-bottom)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Write in public. Grow your audience.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Link href={appAuthHref("/login")} className="min-h-10 inline-flex items-center transition-colors duration-200 hover:text-foreground">
              Log in
            </Link>
            <a
              href={`${MARKETING_ORIGIN}/#pricing`}
              className="min-h-10 inline-flex items-center transition-colors duration-200 hover:text-foreground"
            >
              Pricing
            </a>
          </div>
        </div>
        <p
          className="mt-8 text-center text-xs text-muted-foreground md:text-left"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} Articurls. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
