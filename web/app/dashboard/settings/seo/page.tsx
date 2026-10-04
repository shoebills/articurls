"use client";

import SeoSettings from "@/components/seo-settings";
import { SettingsBreadcrumb } from "@/components/settings-breadcrumb";

export default function SeoSettingsPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      <SettingsBreadcrumb current="Search Engine Optimization" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search Engine Optimization</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search engine indexing, metadata and social previews.
        </p>
      </div>

      <SeoSettings />
    </div>
  );
}
