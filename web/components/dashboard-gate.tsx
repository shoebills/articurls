"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [hasAccessToken, setHasAccessToken] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setHasAccessToken(!!params.get("access_token"));
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasAccessToken) return;
    if (!token) router.replace("/login");
  }, [token, loading, router, hasAccessToken]);

  return <>{children}</>;
}
