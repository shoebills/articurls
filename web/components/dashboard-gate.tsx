"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Dashboard routes exempt from gating (plan-selection redirect and lock/popup
// overlays) so a user can always reach billing and support.
export const DASHBOARD_EXEMPT_PREFIXES = ["/dashboard/billing", "/dashboard/support"];

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading, subscription, sites } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasOAuthCode] = useState(
    () => typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("code")
  );

  const isExempt = DASHBOARD_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const needsSetup = !loading && !hasOAuthCode && !!token && sites.length === 0;
  // A user who has never subscribed (no subscription row) has no trial or
  // plan — funnel them to the plan picker so they start a 7-day trial.
  const needsPlan =
    !loading && !hasOAuthCode && !!token && !needsSetup && subscription === null && !isExempt;

  useEffect(() => {
    if (loading || hasOAuthCode) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (needsSetup) {
      router.replace("/setup");
      return;
    }
    if (needsPlan) {
      router.replace("/dashboard/billing/upgrade");
    }
  }, [token, loading, subscription, router, hasOAuthCode, pathname, needsSetup, needsPlan]);

  if (hasOAuthCode) return <>{children}</>;
  if (loading) return null;
  if (!token) return null;
  if (needsSetup) return null;
  if (needsPlan) return null;
  return <>{children}</>;
}
