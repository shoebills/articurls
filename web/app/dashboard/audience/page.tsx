"use client";

import { useEffect, useState } from "react";
import { ApiError, patchProMe } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Switch } from "@/components/ui/switch";
import { FloatingErrorToast } from "@/components/floating-error-toast";

export default function AudienceEmailsPage() {
  const { token, isPro, refreshUser, user: ctxUser } = useAuth();
  const [subscriberCollectionEnabled, setSubscriberCollectionEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e) {
      setSubscriberCollectionEnabled(previous);
      setErr(e instanceof ApiError ? e.message : "Failed to update subscriber collection");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {!isPro ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Upgrade under Billing to collect subscribers.
          </p>
        ) : null}
        <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium">Collect subscribers</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Show the subscribe button in your public navigation and below blog posts.
            </p>
          </div>
          <Switch
            checked={isPro ? subscriberCollectionEnabled : false}
            onCheckedChange={onToggleCollectSubscribers}
            disabled={!isPro || busy}
            aria-label="Collect subscribers"
          />
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Email Automation</h2>
        </section>
      </div>

      <FloatingErrorToast message={err} onDismiss={() => setErr(null)} />
    </>
  );
}
