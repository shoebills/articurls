import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Size of the wordmark (mark scales with it) */
  size?: "default" | "sm";
  onClick?: () => void;
};

export function BrandLogo({ href = "/", className, size = "default", onClick }: BrandLogoProps) {
  const sm = size === "sm";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2.5 outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:opacity-90 active:opacity-80",
        className
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.38_0.12_264)] font-bold tracking-tight text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-white/10",
          sm ? "h-8 w-8 text-xs" : "h-9 w-9 text-[0.8125rem]"
        )}
        aria-hidden
      >
        A
      </span>
      <span className={cn("font-bold tracking-tight", sm ? "text-base" : "text-lg sm:text-xl")}>Articurls</span>
    </Link>
  );
}
