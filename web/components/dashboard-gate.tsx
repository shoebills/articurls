"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [hasOAuthCode] = useState(
    () => typeof window !== "undefined" && !!new URLSearchParams(window.location.search).get("code")
  );

  useEffect(() => {
    if (loading) return;
    if (hasOAuthCode) return;
    if (!token) router.replace("/login");
  }, [token, loading, router, hasOAuthCode]);

  if (loading || hasOAuthCode) return null;
  if (!token) return null;
  return <>{children}</>;
}
