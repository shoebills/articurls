"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [hasAccessToken, setHasAccessToken] = useState(false);

  // Check for access_token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setHasAccessToken(!!params.get("access_token"));
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasAccessToken) return; // Don't redirect during OAuth callback
    if (!token) router.replace("/login");
  }, [token, loading, router, hasAccessToken]);

  // If OAuth callback, always render children
  if (hasAccessToken) {
    return <>{children}</>;
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
