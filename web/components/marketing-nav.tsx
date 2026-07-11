"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { appAuthHref } from "@/lib/env";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog Examples", href: "#examples" },
  { label: "Docs", href: "/docs" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const signupUrl = appAuthHref("/signup");
  const loginUrl = appAuthHref("/login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && !navRef.current?.contains(target)) setOpen(false);
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
    <header
      ref={navRef}
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-50 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-300 ease-out border-b border-transparent data-[scrolled]:border-border/60 data-[scrolled]:bg-background/70 data-[scrolled]:backdrop-blur-xl data-[scrolled]:backdrop-saturate-150"
    >
      <div className="mx-auto w-full max-w-[1280px] px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] sm:px-8">
        <div className="flex h-[72px] items-center justify-between gap-6">
          <div className="flex shrink-0 items-center">
            <BrandLogo />
          </div>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-7 md:flex">
            <NavLink href={loginUrl}>Login</NavLink>
            <a
              href={signupUrl}
              className="inline-flex h-9 items-center rounded-lg bg-[#7C3AED] px-4 text-sm font-medium text-white shadow-sm shadow-[#7C3AED]/25 outline-none transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-[#6D28D9] hover:shadow-md hover:shadow-[#7C3AED]/30 focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Start Free
            </a>
          </div>

          <button
            type="button"
            className="-mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground/70 outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-marketing-menu"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-marketing-menu"
        className={`absolute inset-x-0 top-full origin-top md:hidden transition-all duration-250 ease-out ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1.5 opacity-0"
        }`}
      >
        <div className="mx-auto max-w-[1280px] px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-4 sm:px-8">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-xl shadow-black/[0.06] backdrop-blur-xl">
            <nav className="flex flex-col p-2" aria-label="Mobile">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex min-h-12 items-center rounded-xl px-4 text-[0.95rem] font-medium text-foreground/80 transition-colors duration-200 hover:bg-muted hover:text-foreground active:bg-muted/80"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={loginUrl}
                className="flex min-h-12 items-center rounded-xl px-4 text-[0.95rem] font-medium text-foreground/80 transition-colors duration-200 hover:bg-muted hover:text-foreground active:bg-muted/80"
                onClick={() => setOpen(false)}
              >
                Login
              </a>
            </nav>
            <div className="p-2 pt-0">
              <a
                href={signupUrl}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#7C3AED] px-4 text-[0.95rem] font-medium text-white transition-colors duration-200 hover:bg-[#6D28D9] active:scale-[0.99] motion-reduce:active:scale-100"
                onClick={() => setOpen(false)}
              >
                Start Free
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isInternal = href.startsWith("/") && !href.startsWith("//");
  const className =
    "text-sm font-medium text-foreground/60 outline-none transition-colors duration-200 hover:text-foreground focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4";
  if (isInternal) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
