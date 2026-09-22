"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/types";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicFaqSection({ items }: { items: FaqItem[] }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  if (!Array.isArray(items) || items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <section className="mt-14 pt-10 border-t border-border/60">
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6">
        FAQs
      </h3>
      <div className="space-y-3">
        {items.map((item, idx) => {
          const isOpen = openIndices.has(idx);
          return (
            <div
              key={idx}
              className="rounded-xl border border-border/70 bg-card transition-all"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left select-none cursor-pointer group"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                  {item.question || "Untitled Question"}
                </span>
                <div className="relative h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                  <ChevronDown
                    className={cn(
                      "absolute inset-0 h-5 w-5 transition-all duration-200",
                      isOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                    )}
                  />
                  <X
                    className={cn(
                      "absolute inset-0 h-5 w-5 transition-all duration-200",
                      isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                    )}
                  />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-0 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-1 pt-4">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
