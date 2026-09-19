"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CodeInjectionSettings } from "@/components/code-injection-settings";

export default function CodeInjectionSettingsPage() {
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Code Injection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add custom head/body scripts and CSS to your site.
        </p>
      </div>

      <CodeInjectionSettings />
    </div>
  );
}
