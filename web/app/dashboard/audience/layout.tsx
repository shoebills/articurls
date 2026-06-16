"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiError, patchProMe } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FloatingErrorToast } from "@/components/floating-error-toast";

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
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [subscriberCollectionEnabled, setSubscriberCollectionEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ctxUser) {
      setSubscriberCollectionEnabled(ctxUser.subscriber_collection_enabled ?? true);
    }
  }, [ctxUser]);

  async function onToggleCollectSubscribers(nextValue: boolean) {
    if (!token || !isPro) return;
    const previous = subscriberCollectionEnabled;
    setSubscriberCollectionEnabled(nextValue);
    setBusy(true);
    setErr(null);
    try {
      await patchProMe(token, { subscriber_collection_enabled: nextValue });
      await refreshUser();
      setSavedMsg("Saved");
    } catch (e) {
      setSubscriberCollectionEnabled(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to update subscriber collection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>

        {!isPro ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Upgrade under Billing to collect subscribers.
          </p>
        ) : null}
        <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium">Collect subscribers</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Show the subscribe button in your blog menu and below blog posts.
            </p>
          </div>
          <Switch
            checked={isPro ? subscriberCollectionEnabled : false}
            onCheckedChange={onToggleCollectSubscribers}
            disabled={!isPro || busy}
            aria-label="Collect subscribers"
          />
        </div>

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

      <FloatingErrorToast
        message={savedMsg}
        onDismiss={() => setSavedMsg(null)}
        autoDismissMs={3000}
        variant="success"
      />
      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
