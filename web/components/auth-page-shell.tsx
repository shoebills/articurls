import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MARKETING_ORIGIN } from "@/lib/env";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,oklch(0.55_0.14_264/0.14),transparent_55%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.5]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-10 flex justify-center sm:mb-12">
          <BrandLogo href={MARKETING_ORIGIN} />
        </div>
        {children}
      </div>
    </div>
  );
}
