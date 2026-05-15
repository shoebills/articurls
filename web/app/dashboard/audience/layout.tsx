"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const audienceTabs = [
  { href: "/dashboard/audience", label: "Emails", match: (path: string) => path === "/dashboard/audience" },
  {
    href: "/dashboard/audience/analytics",
    label: "Analytics",
    match: (path: string) => path.startsWith("/dashboard/audience/analytics"),
  },
] as const;

export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>

      <div
        role="tablist"
        aria-label="Audience sections"
        className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-flex sm:h-9 sm:w-auto"
      >
        {audienceTabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors sm:min-h-8",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
