"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AudienceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/audience/analytics");
  }, [router]);

  return null;
}
