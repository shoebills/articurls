import { cn } from "@/lib/utils";
import type { BlogStatus } from "@/lib/types";

const config: Record<
  BlogStatus,
  { dot: string; pill: string; label: string }
> = {
  published: {
    dot: "bg-emerald-500",
    pill: "border-emerald-500/25 bg-emerald-500/[0.11] text-emerald-900",
    label: "Published",
  },
  archived: {
    dot: "bg-zinc-400",
    pill: "border-zinc-400/30 bg-zinc-500/[0.09] text-zinc-700",
    label: "Archived",
  },
  scheduled: {
    dot: "bg-amber-500",
    pill: "border-amber-500/25 bg-amber-500/[0.14] text-amber-950",
    label: "Scheduled",
  },
  draft: {
    dot: "bg-sky-500",
    pill: "border-sky-500/22 bg-sky-500/[0.1] text-sky-950",
    label: "Draft",
  },
};

export function BlogStatusBadge({
  status,
  className,
}: {
  status: BlogStatus;
  className?: string;
}) {
  const c = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight shadow-sm",
        c.pill,
        className
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", c.dot)} aria-hidden />
      {c.label}
    </span>
  );
}
