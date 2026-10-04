"use client";

import { CodeInjectionSettings } from "@/components/code-injection-settings";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

export default function CodeInjectionSettingsPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-12 sm:space-y-8">
      <SettingsBreadcrumb current="Code Injection" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Code Injection</h1>
      </div>

      <CodeInjectionSettings />
    </div>
  );
}
