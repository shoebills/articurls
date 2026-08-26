"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { MARKETING_FAQS } from "@/lib/marketing-faqs";

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-[calc(4.5rem+env(safe-area-inset-top))] px-[max(1rem,env(safe-area-inset-left))] pb-8 pr-[max(1rem,env(safe-area-inset-right))] pt-8 sm:px-6 sm:pb-12">
      <div className="mx-auto max-w-[800px]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {MARKETING_FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-btn-${i}`;
            return (
              <div
                key={item.question}
                data-open={isOpen || undefined}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card transition-colors duration-200 data-[open]:border-primary/30"
              >
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left outline-none transition-colors duration-200 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6 sm:py-5"
                  >
                    <span className={`min-w-0 flex-1 text-base font-medium tracking-tight transition-colors duration-200 ${isOpen ? "text-primary" : "text-foreground"}`}>
                      {item.question}
                    </span>
                    <Plus
                      className={`h-5 w-5 shrink-0 transition-all duration-300 ease-out ${isOpen ? "rotate-45 text-primary" : "text-muted-foreground"}`}
                      aria-hidden
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6 sm:text-[0.9375rem]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
