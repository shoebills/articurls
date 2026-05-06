"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;
    
    // Don't redirect if there's an access_token in the URL (OAuth callback)
    const hasAccessToken = searchParams.get("access_token");
    if (hasAccessToken) return;
    
    if (!token) router.replace("/login");
  }, [token, loading, router, searchParams]);

  // Show loading while auth is initializing or if there's an access_token being processed
  const hasAccessToken = searchParams.get("access_token");
  if (loading || (!token && !hasAccessToken)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
