"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import {
  normalizeNavBlogNameSize,
  publicNavDesktopBlogTitleClassName,
  type NavBlogNameSize,
} from "@/lib/nav-blog-name";
import { cn } from "@/lib/utils";

/** Matches `gap-x-3` (0.75rem) for width math. */
const LINK_GAP_PX = 12;

export type PublicNavDesktopLink = {
  href: string;
  label: string;
  active?: boolean;
};

type PublicDesktopNavProps = {
  title: string;
  titleHref: string;
  nameSize?: NavBlogNameSize | string | null;
  links: PublicNavDesktopLink[];
  showSubscribe: boolean;
  userName?: string;
  authorName?: string;
};

function linkClass(active?: boolean) {
  return cn(
    "whitespace-nowrap text-sm transition-colors",
    active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

export function PublicDesktopNav({
  title,
  titleHref,
  nameSize,
  links,
  showSubscribe,
  userName,
  authorName,
}: PublicDesktopNavProps) {
  const size = normalizeNavBlogNameSize(nameSize);
  const [inlineCount, setInlineCount] = useState(links.length);
  const navSlotRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const recompute = useCallback(() => {
    const slot = navSlotRef.current;
    const measureRoot = measureRef.current;
    if (!slot || !measureRoot || links.length === 0) {
      setInlineCount(links.length);
      return;
    }

    const linkEls = measureRoot.querySelectorAll<HTMLElement>("[data-nav-link-measure]");
    const widths = Array.from(linkEls).map((el) => el.offsetWidth);
    const moreEl = measureRoot.querySelector<HTMLElement>("[data-more-measure]");
    const moreW = moreEl?.offsetWidth ?? 80;

    const avail = slot.clientWidth;
    let best = 0;
    for (let k = links.length; k >= 0; k--) {
      const needMore = k < links.length;
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
  }, [links]);

  useLayoutEffect(() => {
    recompute();
    const slot = navSlotRef.current;
    if (!slot) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(slot);
    return () => ro.disconnect();
  }, [recompute]);

  const inlineLinks = links.slice(0, inlineCount);
  const overflowLinks = links.slice(inlineCount);

  return (
    <div className="relative flex w-full items-center gap-x-4 sm:gap-x-6">
      <div
        ref={measureRef}
        className="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-x-3 opacity-0"
        aria-hidden
      >
        {links.map((l) => (
          <span key={l.href} data-nav-link-measure className={linkClass(l.active)}>
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
        href={titleHref}
        className={cn(
          publicNavDesktopBlogTitleClassName(size),
          "!flex-none min-w-0 max-w-[min(100%,14rem)] shrink-0 truncate pr-3 sm:max-w-[45%]"
        )}
      >
        {title}
      </Link>

      <div ref={navSlotRef} className="flex min-w-0 flex-1 items-center justify-end gap-x-3">
        {inlineLinks.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.active)}>
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
            <DropdownMenuContent align="end" className="min-w-[10rem] bg-white">
              {overflowLinks.map((l) => (
                <DropdownMenuItem key={l.href} asChild className={cn(l.active && "font-medium")}>
                  <Link href={l.href}>{l.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {showSubscribe && userName ? (
        <div className="shrink-0">
          <SubscribeToAuthor mode="dialog" userName={userName} authorName={authorName} />
        </div>
      ) : null}
    </div>
  );
}
