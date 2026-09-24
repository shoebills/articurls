"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchButton } from "@/components/search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/env";

const LINK_GAP_PX = 32;

export type PublicNavDesktopLink = {
  href: string;
  label: string;
  active?: boolean;
  is_cta?: boolean;
  open_in_new_tab?: boolean;
};

type PublicDesktopNavProps = {
  title: string;
  titleHref: string;
  links: PublicNavDesktopLink[];
  subdomain: string;
  logoUrl?: string | null;
  searchEnabled?: boolean;
  themeToggleEnabled?: boolean;
  alignment?: "left" | "center" | "right" | string;
  basePath?: string;
  buttonVariant?: string;
};

function linkClass(active?: boolean, isCta?: boolean) {
  if (isCta) {
    return "inline-flex h-9 items-center gap-1 whitespace-nowrap px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground shadow-2xs hover:opacity-90 transition-opacity";
  }
  return cn(
    "whitespace-nowrap text-sm transition-colors",
    active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
  );
}

export function PublicDesktopNav({
  title,
  titleHref,
  links,
  subdomain,
  logoUrl,
  searchEnabled = true,
  themeToggleEnabled = true,
  alignment = "left",
  basePath = "",
  buttonVariant = "solid",
}: PublicDesktopNavProps) {
  const ctaLinks = links.filter((l) => l.is_cta);
  const regularLinks = links.filter((l) => !l.is_cta);
  const [inlineCount, setInlineCount] = useState<number | null>(null);
  const navSlotRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const recompute = useCallback(() => {
    const slot = navSlotRef.current;
    const measureRoot = measureRef.current;
    if (!slot || !measureRoot || regularLinks.length === 0) {
      setInlineCount(regularLinks.length);
      return;
    }

    const linkEls = measureRoot.querySelectorAll<HTMLElement>("[data-nav-link-measure]");
    const widths = Array.from(linkEls).map((el) => el.offsetWidth);
    const moreEl = measureRoot.querySelector<HTMLElement>("[data-more-measure]");
    const moreW = moreEl?.offsetWidth ?? 80;

    const avail = slot.clientWidth;
    let best = 0;
    for (let k = regularLinks.length; k >= 0; k--) {
      const needMore = k < regularLinks.length;
      let total = 0;
      for (let i = 0; i < k; i++) {
        total += widths[i] ?? 0;
        if (i < k - 1) total += LINK_GAP_PX;
      }
      if (needMore) {
        if (k > 0) total += LINK_GAP_PX;
        total += moreW;
      }
      if (total <= avail) {
        best = k;
        break;
      }
    }
    setInlineCount(best);
  }, [regularLinks]);

  useLayoutEffect(() => {
    recompute();
    const slot = navSlotRef.current;
    if (!slot) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(slot);
    return () => {
      ro.disconnect();
    };
  }, [recompute]);

  const inlineLinks = inlineCount === null ? [] : regularLinks.slice(0, inlineCount);
  const overflowLinks = inlineCount === null ? [] : regularLinks.slice(inlineCount);

  const slotJustify =
    alignment === "center"
      ? "justify-center"
      : alignment === "left"
        ? "justify-start"
        : "justify-end";

  return (
    <div className="relative flex w-full items-center gap-x-6 sm:gap-x-8">
      <div
        ref={measureRef}
        className="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-x-8 opacity-0"
        aria-hidden
      >
        {regularLinks.map((l) => (
          <span key={l.href} data-nav-link-measure className={linkClass(l.active, l.is_cta)}>
            {l.label}
          </span>
        ))}
        <span
          data-more-measure
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-muted-foreground"
        >
          More
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </span>
      </div>

      <Link
        prefetch={false}
        href={titleHref}
        className="!flex-none min-w-0 max-w-[min(100%,14rem)] shrink-0 truncate pr-3 sm:max-w-[45%] flex items-center"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(logoUrl)}
            alt={title}
            className="h-8 max-h-8 w-auto object-contain"
          />
        ) : (
          <span className="text-2xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity truncate">
            {title}
          </span>
        )}
      </Link>

      <div ref={navSlotRef} className={cn("flex min-w-0 flex-1 items-center gap-x-8 overflow-hidden", slotJustify)}>
        {inlineCount === null ? (
          <span className="invisible text-sm" aria-hidden>
            Placeholder
          </span>
        ) : (
          <>
            {inlineLinks.map((l) => (
              <Link
                prefetch={false}
                key={l.href}
                href={l.href}
                target={l.open_in_new_tab ? "_blank" : undefined}
                rel={l.open_in_new_tab ? "noopener noreferrer" : undefined}
                className={linkClass(l.active, l.is_cta)}
              >
                {l.label}
              </Link>
            ))}
            {overflowLinks.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
                  >
                    More
                    <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[10rem] origin-top">
                  {overflowLinks.map((l) => (
                    <DropdownMenuItem key={l.href} asChild className={cn(l.active && "font-medium")}>
                      <Link
                        prefetch={false}
                        href={l.href}
                        target={l.open_in_new_tab ? "_blank" : undefined}
                        rel={l.open_in_new_tab ? "noopener noreferrer" : undefined}
                      >
                        <span className="flex items-center justify-between w-full">
                          {l.label}
                          {l.open_in_new_tab ? <ExternalLink className="h-3 w-3 opacity-60 ml-2" /> : null}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        )}
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {themeToggleEnabled !== false ? <ThemeToggle /> : null}
        {subdomain && searchEnabled !== false ? (
          <SearchButton
            iconClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
            subdomain={subdomain}
            basePath={basePath}
          />
        ) : null}
        {ctaLinks.map((l) => (
          <Link
            key={l.href}
            prefetch={false}
            href={l.href}
            target={l.open_in_new_tab ? "_blank" : undefined}
            rel={l.open_in_new_tab ? "noopener noreferrer" : undefined}
            data-button-variant={buttonVariant}
            data-button-radius="true"
            className={linkClass(l.active, l.is_cta)}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
