"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { SearchButton } from "@/components/search-button";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { normalizeNavBlogNameSize, publicNavMobileBlogTitleClassName, type NavBlogNameSize } from "@/lib/nav-blog-name";
import { cn } from "@/lib/utils";

const TRAY_GAP_BELOW_NAVBAR_PX = 8;

type TrayLayout = { top: number; left: number; width: number };

type PublicMobileNavMenuProps = {
  title: string;
  titleHref?: string;
  /** Blog name size from design settings (default medium). */
  nameSize?: NavBlogNameSize | string | null;
  links: Array<{ href: string; label: string }>;
  userName?: string;
  authorName?: string;
  showSubscribeAction?: boolean;
  showSearch?: boolean;
  /** When false, only the title row is shown (no hamburger). */
  showMenuButton?: boolean;
};

export function PublicMobileNavMenu({
  title,
  titleHref,
  nameSize,
  links,
  userName,
  authorName,
  showSubscribeAction = true,
  showSearch = false,
  showMenuButton = true,
}: PublicMobileNavMenuProps) {
  const size = normalizeNavBlogNameSize(nameSize);
  const titleClass = publicNavMobileBlogTitleClassName(size);
  const [open, setOpen] = useState(false);
  const [trayLayout, setTrayLayout] = useState<TrayLayout | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updateTrayLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root || !open) return;
    const rootBox = root.getBoundingClientRect();
    const navHost = root.closest("[data-public-nav]");
    const bottomEdge = navHost ? navHost.getBoundingClientRect().bottom : rootBox.bottom;
    setTrayLayout({
      top: bottomEdge + TRAY_GAP_BELOW_NAVBAR_PX,
      left: rootBox.left,
      width: rootBox.width,
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTrayLayout(null);
      return;
    }
    // Defer measurement to avoid forced reflow
    const timer = requestAnimationFrame(() => {
      updateTrayLayout();
    });
    const scrollOpts: AddEventListenerOptions = { capture: true };
    window.addEventListener("resize", updateTrayLayout);
    window.addEventListener("scroll", updateTrayLayout, scrollOpts);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("resize", updateTrayLayout);
      window.removeEventListener("scroll", updateTrayLayout, scrollOpts);
    };
  }, [open, updateTrayLayout]);

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
            {showSearch ? (
              <SearchButton
                iconClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:bg-white hover:text-foreground"
                trayClassName="fixed z-50 w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border/80 bg-white shadow-lg transition-opacity duration-200 ease-out"
              />
            ) : null}
            {links.length > 0 ? (
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((prev) => !prev)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/80 bg-white text-muted-foreground shadow-sm transition-all duration-200 hover:bg-white hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </button>
            ) : showSubscribeAction && userName ? (
              <SubscribeToAuthor
                mode="dialog"
                userName={userName}
                authorName={authorName}
                triggerClassName="flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-md transition-all duration-200 p-0"
                triggerChildren={<Bell className="h-4 w-4" />}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {showMenuButton && open ? (
        <div
          id={menuId}
          className={cn(
            "fixed z-50 max-h-[min(72dvh,28rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-white shadow-lg transition-opacity duration-200 ease-out",
            trayLayout ? "opacity-100" : "pointer-events-none opacity-0"
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
          aria-hidden={!trayLayout}
        >
          {links.length > 0 ? (
            <div className="space-y-1.5 p-1.5">
              {links.map((item) => (
                <Link
                  prefetch={false}
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-center text-sm text-foreground/90 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : !showSubscribeAction ? (
            <p className="px-3 py-2 text-center text-sm text-muted-foreground">No categories</p>
          ) : null}

          {showSubscribeAction && userName ? (
            <div className={`flex flex-col items-center ${links.length > 0 ? "border-t border-border/60 p-1.5" : "p-1.5"}`}>
              <SubscribeToAuthor
                mode="dialog"
                userName={userName}
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

