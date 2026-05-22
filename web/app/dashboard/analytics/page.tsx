"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUmamiDashboard,
  getSubscription,
  isProSubscription,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2, Loader2 } from "lucide-react";

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; shareUrl: string }
  | { status: "not_provisioned" }
  | { status: "error"; message: string };

function ProDashboard({ token }: { token: string }) {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUmamiDashboard(token);
        if (!cancelled) setState({ status: "ready", shareUrl: data.share_url });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setState({ status: "not_provisioned" });
        } else {
          setState({
            status: "error",
            message: e instanceof ApiError ? e.message : "Failed to load analytics dashboard",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "not_provisioned") {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BarChart2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold">Dashboard not ready yet</h2>
          <p className="text-sm text-muted-foreground">
            Your analytics website is being set up. This usually takes less than a minute — refresh
            the page to check again.
          </p>
        </div>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto max-w-sm space-y-3">
          <p className="text-sm text-destructive">{state.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <iframe
        src={state.shareUrl}
        title="Analytics dashboard"
        className="h-[700px] w-full"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    getSubscription(token)
      .then((sub) => setIsPro(isProSubscription(sub)))
      .catch(() => setIsPro(false));
  }, [token]);

  if (isPro === null || !token) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics</h1>
        {isPro && (
          <p className="mt-1 text-sm text-muted-foreground">
            Full visitor analytics for your blog.
          </p>
        )}
      </div>

      {isPro ? (
        <ProDashboard token={token} />
      ) : (
        <Card className="p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <BarChart2 className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-lg font-semibold">Unlock full analytics with Pro</h2>
              <p className="text-sm text-muted-foreground">
                Pro gives you a real-time dashboard with page views, unique visitors, referrers,
                countries, devices, and more — powered by Umami.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard/billing")}
              className="shrink-0"
            >
              Upgrade to Pro
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
