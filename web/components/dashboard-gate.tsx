"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    // Don't redirect if there's an access_token in the URL (OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const hasAccessToken = params.get("access_token");
    if (hasAccessToken) return;
    
    if (!token) router.replace("/login");
  }, [token, loading, router]);

  // If there's an access_token in URL, render children immediately so they can process it
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("access_token")) {
      return <>{children}</>;
    }
  }

  // Normal auth check
  if (loading || !token) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
