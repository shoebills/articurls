"use client";

import IntegrationsSettings from "@/components/integrations-settings";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

export default function IntegrationsSettingsPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12 sm:space-y-8">
      <SettingsBreadcrumb current="Integrations" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Integrations</h1>
      </div>

      <IntegrationsSettings />
    </div>
  );
}