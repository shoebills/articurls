"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/toc";

interface BlogPostTocProps {
  headings: TocHeading[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function BlogPostToc({ headings, collapsible = false, defaultCollapsed = false }: BlogPostTocProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);

  useEffect(() => {
    if (headingIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = new Set<string>();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          }
        }

        if (visible.size > 0) {
          // Pick the first visible heading in document order
          const firstVisible = headingIds.find((id) => visible.has(id));
          if (firstVisible) {
            setActiveId(firstVisible);
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      }
    );

    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [headingIds]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      {collapsible ? (
        <div className="rounded-xl border border-border/80 bg-background shadow-sm">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
            aria-expanded={isOpen}
            aria-controls="toc-collapse"
          >
            <span>On this page</span>
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
              aria-hidden
            />
          </button>
            <div
              id="toc-collapse"
              className={cn(
                "transition-all duration-200 ease-out",
                isOpen ? "max-h-[70vh] overflow-y-auto pb-3" : "max-h-0 overflow-hidden"
              )}
            >
              <ul className="space-y-1 border-l border-border pl-3">
                {headings.map((heading) => (
                  <TocItem key={heading.id} heading={heading} activeId={activeId} />
                ))}
              </ul>
            </div>
        </div>
      ) : (
        <div className="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On this page
          </p>
          <ul className="space-y-1 border-l border-border pl-3">
            {headings.map((heading) => (
              <TocItem key={heading.id} heading={heading} activeId={activeId} />
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

function TocItem({ heading, activeId }: { heading: TocHeading; activeId: string | null }) {
  const isActive = activeId === heading.id;
  return (
    <li>
      <a
        href={`#${heading.id}`}
        className={cn(
          "block rounded-md py-1 pr-2 text-sm transition-colors hover:text-foreground",
          heading.level === 3 && "pl-3",
          isActive ? "font-medium text-foreground" : "text-muted-foreground"
        )}
        aria-current={isActive ? "location" : undefined}
      >
        {heading.text}
      </a>
    </li>
  );
}
