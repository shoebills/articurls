"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SubscribeToAuthor } from "@/components/subscribe-to-author";

type PublicMobileNavMenuProps = {
  title: string;
  titleHref?: string;
  links: Array<{ href: string; label: string }>;
  userName: string;
  authorName: string;
};

export function PublicMobileNavMenu({ title, titleHref, links, userName, authorName }: PublicMobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

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
    <div ref={rootRef} className="relative sm:hidden">
      <div className="flex items-center justify-between gap-3">
        {titleHref ? (
          <Link href={titleHref} className="truncate text-lg font-semibold hover:underline">
            {title}
          </Link>
        ) : (
          <p className="truncate text-lg font-semibold">{title}</p>
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

      <div
        id={menuId}
        className={`absolute inset-x-0 top-full z-20 mt-2.5 overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl shadow-black/10 transition-all duration-250 ease-in-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        {links.length > 0 ? (
          <div className="space-y-1.5 p-1.5">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}

        <div className={`${links.length > 0 ? "border-t border-border/60 p-1.5" : "p-1.5"}`}>
          <SubscribeToAuthor
            mode="dialog"
            userName={userName}
            authorName={authorName}
            triggerClassName="h-8 min-h-8 w-full rounded-md px-3 text-xs font-medium"
          />
        </div>
      </div>
    </div>
  );
}
