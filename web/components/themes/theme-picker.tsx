"use client";

import { useAuth } from "@/lib/auth-context";
import { type DesignSettings } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Check, Columns3, LayoutTemplate } from "lucide-react";

export function ThemePicker({
  settings,
  onChange,
}: {
  settings: DesignSettings;
  onChange: (updates: Partial<DesignSettings>) => void;
}) {
  const { isPro } = useAuth();
  const theme = settings.template_id || "editorial";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">1. Blog Template</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select the core structure of your publication.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Editorial */}
        <button
          type="button"
          onClick={() => onChange({ template_id: "editorial" })}
          className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
            theme === "editorial"
              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          {theme === "editorial" && (
            <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-3">
            <LayoutTemplate className={`h-5 w-5 ${theme === "editorial" ? "text-primary" : "text-muted-foreground"}`} />
            <h4 className="font-semibold text-foreground">Normal / Editorial</h4>
          </div>
          
          {/* Wireframe */}
          <div className="aspect-[4/3] w-full bg-background rounded-md border shadow-xs p-2 mb-3 flex flex-col gap-2">
             <div className="w-1/2 h-3 bg-muted rounded mx-auto mt-2"></div>
             <div className="w-3/4 h-2 bg-muted/60 rounded mx-auto mb-2"></div>
             <div className="w-full h-16 bg-muted/40 rounded flex flex-col justify-end p-1.5">
                <div className="w-1/3 h-1.5 bg-muted rounded"></div>
             </div>
             <div className="w-full h-16 bg-muted/40 rounded flex flex-col justify-end p-1.5">
                <div className="w-1/3 h-1.5 bg-muted rounded"></div>
             </div>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ideal for writers, essayists, and thought leadership. Features a centered layout and linear feed.
          </p>
        </button>

        {/* SaaS */}
        <button
          type="button"
          onClick={() => onChange({ template_id: "saas" })}
          className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
            theme === "saas"
              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
              : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          {theme === "saas" && (
            <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex items-center gap-2.5 mb-3">
            <Columns3 className={`h-5 w-5 ${theme === "saas" ? "text-primary" : "text-muted-foreground"}`} />
            <h4 className="font-semibold text-foreground">SaaS / Resource Hub</h4>
          </div>
          
          {/* Wireframe */}
          <div className="aspect-[4/3] w-full bg-background rounded-md border shadow-xs p-2 mb-3 flex flex-col gap-2">
             <div className="flex gap-2 mb-2">
                 <div className="flex-1 flex flex-col gap-1.5 pt-1">
                    <div className="w-full h-2 bg-muted rounded"></div>
                    <div className="w-3/4 h-2 bg-muted/60 rounded"></div>
                 </div>
                 <div className="w-1/3 aspect-square bg-muted/40 rounded"></div>
             </div>
             <div className="flex gap-1 mb-1">
                 <div className="w-8 h-2 bg-muted rounded-full"></div>
                 <div className="w-12 h-2 bg-muted/40 rounded-full"></div>
                 <div className="w-10 h-2 bg-muted/40 rounded-full"></div>
             </div>
             <div className="flex gap-2">
                <div className="flex-1 h-12 bg-muted/40 rounded"></div>
                <div className="flex-1 h-12 bg-muted/40 rounded"></div>
             </div>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ideal for startups, product updates, and resource hubs. Features category filters and a grid layout.
          </p>
        </button>
      </div>
    </div>
  );
}
