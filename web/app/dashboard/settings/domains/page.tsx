"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getMe } from "@/lib/api";
import { DomainSettings } from "@/components/domain-settings";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

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
      <SettingsBreadcrumb current="Domains" />

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
