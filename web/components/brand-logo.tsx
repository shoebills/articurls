import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Size of the wordmark (mark scales with it) */
  size?: "default" | "sm";
  showIcon?: boolean;
  onClick?: () => void;
};

export function BrandLogo({ href = "/", className, size = "default", showIcon = true, onClick }: BrandLogoProps) {
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
      {showIcon ? (
        <img
          src="/articurls-logo.svg"
          alt="Articurls"
          className={cn("shrink-0", sm ? "h-8 w-8" : "h-9 w-9")}
          aria-hidden
        />
      ) : null}
      <span className={cn("font-bold tracking-tight", sm ? "text-xl" : "text-2xl sm:text-3xl")}>Articurls</span>
    </Link>
  );
}
