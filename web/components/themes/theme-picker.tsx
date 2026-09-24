"use client";

import { Check, ExternalLink } from "lucide-react";
import { UGC_DOMAIN } from "@/lib/env";

export function ThemePicker() {
  const saasDemoUrl = `https://saas.${UGC_DOMAIN}`;

  return (
    <div className="max-w-md">
      {/* SaaS Template — Active Launch Template */}
      <div
        className="group relative flex flex-col justify-between rounded-xl border-2 border-primary bg-primary/[0.03] p-4 text-left shadow-sm ring-1 ring-primary/20"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="font-semibold text-foreground text-base">Saas</h4>

            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Check className="h-3.5 w-3.5" />
              <span>Active</span>
            </div>
          </div>

          {/* Wireframe Diagram */}
          <div className="aspect-[16/9] w-full rounded-lg border border-border/80 bg-muted/20 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-10 rounded-full bg-primary/40" />
              <div className="h-2 w-8 rounded-full bg-foreground/15" />
              <div className="h-2 w-12 rounded-full bg-foreground/15" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border/60 bg-background/80 p-1.5 shadow-2xs">
                <div className="aspect-[16/10] w-full rounded-xs bg-foreground/10 mb-1" />
                <div className="h-1.5 w-3/4 rounded-xs bg-foreground/20" />
              </div>
              <div className="rounded-md border border-border/60 bg-background/80 p-1.5 shadow-2xs">
                <div className="aspect-[16/10] w-full rounded-xs bg-foreground/10 mb-1" />
                <div className="h-1.5 w-3/4 rounded-xs bg-foreground/20" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end">
          <a
            href={saasDemoUrl}
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
