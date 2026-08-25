"use client";

import { type DesignSettings } from "@/lib/types";
import { Check, Columns3, ExternalLink, LayoutTemplate } from "lucide-react";
import { UGC_DOMAIN } from "@/lib/env";

export function ThemePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const selectedTemplate = settings.template_id || "editorial";

  const editorialDemoUrl = `https://editorial.${UGC_DOMAIN}`;
  const saasDemoUrl = `https://saas.${UGC_DOMAIN}`;

  return (
    <div className="grid grid-cols-1 gap-4 max-w-2xl md:grid-cols-2">
      {/* Editorial Template */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onChange({ template_id: "editorial" })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange({ template_id: "editorial" });
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
          selectedTemplate === "editorial"
            ? "border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary/20"
            : "border-border/70 hover:border-border hover:bg-muted/30"
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                  selectedTemplate === "editorial"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground"
                }`}
              >
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-base">Editorial</h4>
                <p className="text-xs text-muted-foreground">Clean, centered typography</p>
              </div>
            </div>

            {selectedTemplate === "editorial" ? (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Check className="h-3.5 w-3.5" />
                <span>Active</span>
              </div>
            ) : null}
          </div>

          {/* Wireframe Diagram */}
          <div className="aspect-[16/9] w-full rounded-lg border border-border/80 bg-muted/20 p-3 mb-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="mx-auto h-2.5 w-1/3 rounded-full bg-foreground/25" />
              <div className="mx-auto h-1.5 w-1/2 rounded-full bg-foreground/10" />
            </div>
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-background/80 p-2 shadow-2xs">
                <div className="h-2 w-3/4 rounded-sm bg-foreground/20 mb-1" />
                <div className="h-1.5 w-full rounded-sm bg-foreground/10" />
              </div>
              <div className="rounded-md border border-border/60 bg-background/80 p-2 shadow-2xs">
                <div className="h-2 w-2/3 rounded-sm bg-foreground/20 mb-1" />
                <div className="h-1.5 w-full rounded-sm bg-foreground/10" />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Perfect for writers, personal blogs, and essays.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end">
          <a
            href={editorialDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4"
          >
            Live Demo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* SaaS Template */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onChange({ template_id: "saas" })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange({ template_id: "saas" });
          }
        }}
        className={`group relative flex flex-col justify-between rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
          selectedTemplate === "saas"
            ? "border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary/20"
            : "border-border/70 hover:border-border hover:bg-muted/30"
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                  selectedTemplate === "saas"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground"
                }`}
              >
                <Columns3 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-base">SaaS & Hub</h4>
                <p className="text-xs text-muted-foreground">Grid cards & category filter</p>
              </div>
            </div>

            {selectedTemplate === "saas" ? (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Check className="h-3.5 w-3.5" />
                <span>Active</span>
              </div>
            ) : null}
          </div>

          {/* Wireframe Diagram */}
          <div className="aspect-[16/9] w-full rounded-lg border border-border/80 bg-muted/20 p-3 mb-4 flex flex-col justify-between">
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

          <p className="text-xs text-muted-foreground leading-relaxed">
            Built for modern companies and multi-category blogs.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end">
          <a
            href={saasDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
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
