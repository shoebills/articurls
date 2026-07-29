import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionPanel({
  title,
  description,
  sectionId,
  headingId,
  selected,
  children,
}: {
  title: string;
  description: string;
  sectionId: string;
  headingId: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-28 rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-[box-shadow,border-color] duration-200 ease-out hover:border-border hover:shadow-md motion-reduce:transition-none",
        selected && "border-border/80"
      )}
    >
      <div className="p-5 sm:p-6">
        <div>
          <h2 id={headingId} className="text-base font-semibold leading-none tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="border-t p-5 sm:p-6 space-y-5">{children}</div>
    </section>
  );
}
