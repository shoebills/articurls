"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMe } from "@/lib/api";
import { DomainSettings } from "@/components/domain-settings";

export default function DomainsSettingsPage() {
  const { user, token } = useAuth();
  const [fetchedSubdomain, setFetchedSubdomain] = useState("");

  useEffect(() => {
    if (!user?.subdomain && token) {
      getMe(token).then((u) => setFetchedSubdomain(u.subdomain)).catch(() => {});
    }
  }, [user?.subdomain, token]);

  const subdomain = user?.subdomain || fetchedSubdomain || "";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      {/* Top navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Domains</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subdomain, custom domains and subfolder publishing.
        </p>
      </div>

      <DomainSettings subdomain={subdomain} />
    </div>
  );
}
