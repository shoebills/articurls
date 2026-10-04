"use client";

import IntegrationsSettings from "@/components/integrations-settings";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

export default function IntegrationsSettingsPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      <SettingsBreadcrumb current="Integrations" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google Analytics, Search Console and AdSense to your site.
        </p>
      </div>

      <IntegrationsSettings />
    </div>
  );
}