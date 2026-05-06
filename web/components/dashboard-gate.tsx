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

  // Show loading while auth is initializing or if there's an access_token being processed
  if (loading || !token) {
    // Check for access_token without using useSearchParams
    const hasAccessToken = typeof window !== "undefined" && 
      new URLSearchParams(window.location.search).get("access_token");
    
    if (!hasAccessToken && !loading && !token) {
      return null; // Will redirect in useEffect
    }
    
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
