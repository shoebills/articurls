"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [hasOAuthCode, setHasOAuthCode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setHasOAuthCode(!!params.get("code"));
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasOAuthCode) return;
    if (!token) router.replace("/login");
  }, [token, loading, router, hasOAuthCode]);

  return <>{children}</>;
}
