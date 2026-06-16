"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

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
  const { isPro } = useAuth();

  return (
    <>
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>

        {!isPro ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Upgrade under Billing to collect subscribers.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Subscriber collection is managed in{" "}
            <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Settings
            </Link>.
          </p>
        )}

        <nav aria-label="Audience sections" className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-full rounded-xl border bg-muted/30 p-1 sm:min-w-0">
            {audienceTabs.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Button
                  key={tab.href}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-sm"
                  asChild
                >
                  <Link
                    href={tab.href}
                    role="tab"
                    aria-selected={active}
                  >
                    {tab.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </nav>

        {children}
      </div>
    </>
  );
}
