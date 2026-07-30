"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { exchangeOAuthCode } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const exchangedOAuth = useRef(false);

  useEffect(() => {
    if (exchangedOAuth.current) return;
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get("code");

    if (oauthCode) {
      exchangedOAuth.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      exchangeOAuthCode(oauthCode).then(() => {
        const plan = localStorage.getItem("pendingPlan");
        localStorage.removeItem("pendingPlan");
        if (plan === "pro" || plan === "lifetime") {
          window.location.replace(`/dashboard/billing?plan=${plan}`);
        } else {
          window.location.reload();
        }
      }).catch(() => {
        router.replace("/login?error=oauth_failed");
      });
    } else {
      router.replace("/dashboard/posts");
    }
  }, [router]);

  return null;
}
