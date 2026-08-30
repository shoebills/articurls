"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ExternalLink, Menu, X } from "lucide-react";
import { SearchButton } from "@/components/search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { normalizeNavBlogNameSize, publicNavMobileBlogTitleClassName, type NavBlogNameSize } from "@/lib/nav-blog-name";
import { cn } from "@/lib/utils";

const TRAY_GAP_BELOW_NAVBAR_PX = 8;

type TrayLayout = { top: number; left: number; width: number };

export type PublicMobileNavLink = {
  href: string;
  label: string;
  is_cta?: boolean;
  open_in_new_tab?: boolean;
};

type PublicMobileNavMenuProps = {
  title: string;
  titleHref?: string;
  nameSize?: NavBlogNameSize | string | null;
  links: PublicMobileNavLink[];
  subdomain?: string;
  authorName?: string;
  showSubscribeAction?: boolean;
  showMenuButton?: boolean;
  basePath?: string;
};

export function PublicMobileNavMenu({
  title,
  titleHref = "/",
  nameSize = "medium",
  links,
  subdomain,
  authorName,
  showSubscribeAction = false,
  showMenuButton = true,
  basePath = "",
}: PublicMobileNavMenuProps) {
  const size = normalizeNavBlogNameSize(nameSize);
  const titleClass = publicNavMobileBlogTitleClassName(size);
  const [open, setOpen] = useState(false);
  const [trayLayout, setTrayLayout] = useState<TrayLayout | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updateTrayLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootBox = root.getBoundingClientRect();
    const navHost = root.closest("[data-public-nav]");
    const bottomEdge = navHost ? navHost.getBoundingClientRect().bottom : rootBox.bottom;
    setTrayLayout({
      top: bottomEdge + TRAY_GAP_BELOW_NAVBAR_PX,
      left: rootBox.left,
      width: rootBox.width,
    });
  }, []);

  useEffect(() => {
    const timer = requestAnimationFrame(updateTrayLayout);
    const scrollOpts: AddEventListenerOptions = { capture: true };
    window.addEventListener("resize", updateTrayLayout);
    window.addEventListener("scroll", updateTrayLayout, scrollOpts);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("resize", updateTrayLayout);
      window.removeEventListener("scroll", updateTrayLayout, scrollOpts);
    };
  }, [updateTrayLayout]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (target instanceof Element && target.closest('[role="dialog"]')) return;
      if (!rootRef.current?.contains(target)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative [--mobile-nav-rail-gap:2px]">
      <div
        className={cn(
          "flex items-center gap-3 py-[var(--mobile-nav-rail-gap)]",
          showMenuButton ? "justify-between" : "justify-start"
        )}
      >
        {titleHref ? (
          <Link href={titleHref} className={cn(titleClass, !showMenuButton && "!flex-none")}>
            {title}
          </Link>
        ) : (
          <p className={cn(titleClass, !showMenuButton && "!flex-none")}>{title}</p>
        )}

        {showMenuButton ? (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {subdomain ? (
              <SearchButton
                iconClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:text-foreground"
                subdomain={subdomain}
                basePath={basePath}
              />
            ) : null}
            {links.length > 0 ? (
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((prev) => !prev)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted hover:text-foreground"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            ) : showSubscribeAction && subdomain ? (
              <SubscribeToAuthor
                mode="dialog"
                subdomain={subdomain}
                authorName={authorName}
                triggerClassName="flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-md transition-all duration-200 p-0"
                triggerChildren={<Bell className="h-4 w-4" />}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {showMenuButton ? (
        <div
          id={menuId}
          className={cn(
            "fixed z-50 max-h-[min(72dvh,28rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-popover shadow-lg origin-top transition-all duration-250 ease-out",
            open && trayLayout
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1.5 opacity-0"
          )}
          style={
            trayLayout
              ? {
                  top: trayLayout.top,
                  left: trayLayout.left,
                  width: trayLayout.width,
                }
              : undefined
          }
          aria-hidden={!open || !trayLayout}
        >
          {links.length > 0 ? (
            <div className="space-y-1.5 p-1.5">
              {links.map((item) => (
                <Link
                  prefetch={false}
                  key={item.href}
                  href={item.href}
                  target={item.open_in_new_tab ? "_blank" : undefined}
                  rel={item.open_in_new_tab ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    item.is_cta
                      ? "bg-primary text-primary-foreground hover:opacity-90 justify-center text-center"
                      : "text-foreground/90 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  {item.open_in_new_tab && !item.is_cta ? (
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 ml-2" />
                  ) : null}
                </Link>
              ))}
            </div>
          ) : !showSubscribeAction ? (
            <p className="px-3 py-2 text-center text-sm text-muted-foreground">No links</p>
          ) : null}

          {showSubscribeAction && subdomain ? (
            <div className={`flex flex-col items-center ${links.length > 0 ? "border-t border-border/60 p-1.5" : "p-1.5"}`}>
              <SubscribeToAuthor
                mode="dialog"
                subdomain={subdomain}
                authorName={authorName}
                triggerClassName="h-10 min-h-10 w-full justify-center rounded-md px-3 text-center text-sm font-medium"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
