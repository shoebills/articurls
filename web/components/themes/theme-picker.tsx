"use client";

import { Check, ExternalLink } from "lucide-react";
import { UGC_DOMAIN } from "@/lib/env";

export function ThemePicker() {
  const standardDemoUrl = `https://standard.${UGC_DOMAIN}`;

  return (
    <div className="max-w-md">
      {/* Standard Template — Active Launch Template */}
      <div
        className="group relative flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/[0.03] p-4 text-left shadow-sm ring-1 ring-primary/20"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="font-semibold text-foreground text-base">Standard</h4>

            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Check className="h-3.5 w-3.5" />
              <span>Active</span>
            </div>
          </div>

          {/* Wireframe Diagram — mirrors the Standard homepage: nav, hero, pills, borderless cards */}
          <div className="aspect-[16/9] w-full rounded-lg border border-border/80 bg-muted/20 p-3 flex flex-col gap-2 overflow-hidden">
            {/* Nav header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-10 rounded-full bg-primary/40" />
                <div className="h-2 w-8 rounded-full bg-foreground/15" />
                <div className="h-2 w-12 rounded-full bg-foreground/15" />
              </div>
              <div className="h-2 w-2 rounded-full bg-foreground/15" />
            </div>
            {/* Hero */}
            <div className="space-y-1">
              <div className="h-2.5 w-3/4 rounded-full bg-foreground/25" />
              <div className="h-1.5 w-1/2 rounded-full bg-foreground/15" />
            </div>
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="h-4 w-10 shrink-0 rounded-md bg-primary" />
              <div className="h-4 w-12 shrink-0 rounded-md bg-muted" />
              <div className="h-4 w-10 shrink-0 rounded-md bg-muted" />
              <div className="h-4 w-14 shrink-0 rounded-md bg-muted" />
            </div>
            {/* Borderless cards */}
            <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="min-w-0">
                  <div className="aspect-[16/10] w-full rounded-md bg-foreground/10 mb-1" />
                  <div className="h-1.5 w-11/12 rounded-xs bg-foreground/20" />
                  <div className="mt-1 flex items-center justify-between">
                    <div className="h-1.5 w-8 rounded-full bg-primary/30" />
                    <div className="h-1.5 w-6 rounded-full bg-foreground/15" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 flex items-center justify-end">
          <a
            href={standardDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
          >
            Live Demo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
