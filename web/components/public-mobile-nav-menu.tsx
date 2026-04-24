"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";
import { cn } from "@/lib/utils";

const TRAY_GAP_BELOW_NAVBAR_PX = 8;

type TrayLayout = { top: number; left: number; width: number };

type PublicMobileNavMenuProps = {
  title: string;
  titleHref?: string;
  links: Array<{ href: string; label: string }>;
  userName: string;
  authorName: string;
};

export function PublicMobileNavMenu({ title, titleHref, links, userName, authorName }: PublicMobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const [trayLayout, setTrayLayout] = useState<TrayLayout | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updateTrayLayout = useCallback(() => {
    const root = rootRef.current;
    if (!root || !open) return;
    const rootBox = root.getBoundingClientRect();
    const section = root.closest("section");
    const bottomEdge = section ? section.getBoundingClientRect().bottom : rootBox.bottom;
    setTrayLayout({
      top: bottomEdge + TRAY_GAP_BELOW_NAVBAR_PX,
      left: rootBox.left,
      width: rootBox.width,
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setTrayLayout(null);
      return;
    }
    updateTrayLayout();
    const scrollOpts: AddEventListenerOptions = { capture: true };
    window.addEventListener("resize", updateTrayLayout);
    window.addEventListener("scroll", updateTrayLayout, scrollOpts);
    return () => {
      window.removeEventListener("resize", updateTrayLayout);
      window.removeEventListener("scroll", updateTrayLayout, scrollOpts);
    };
  }, [open, updateTrayLayout]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
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
    <div ref={rootRef} className="relative sm:hidden [--mobile-nav-rail-gap:2px]">
      <div className="flex items-center justify-between gap-3 py-[var(--mobile-nav-rail-gap)]">
        {titleHref ? (
          <Link
            href={titleHref}
            className="flex min-h-9 min-w-0 flex-1 items-center truncate text-lg font-semibold leading-tight hover:underline"
          >
            {title}
          </Link>
        ) : (
          <p className="flex min-h-9 min-w-0 flex-1 items-center truncate text-lg font-semibold leading-tight">{title}</p>
        )}

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/95 text-muted-foreground shadow-md shadow-black/10 transition-all duration-200 hover:bg-background hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div
          id={menuId}
          className={cn(
            "fixed z-50 max-h-[min(72dvh,28rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-background transition-opacity duration-200 ease-out",
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
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-center text-sm text-foreground/90 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className={`flex flex-col items-center ${links.length > 0 ? "border-t border-border/60 p-1.5" : "p-1.5"}`}>
            <SubscribeToAuthor
              mode="dialog"
              userName={userName}
              authorName={authorName}
              triggerClassName="h-8 min-h-8 w-full justify-center rounded-md px-3 text-center text-xs font-medium"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
