import { cn } from "@/lib/utils";
import type { BlogStatus } from "@/lib/types";

const config: Record<
  BlogStatus,
  {
    dot: string;
    ring: string;
    pill: string;
    label: string;
    animate: string;
  }
> = {
  published: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    pill: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    label: "Published",
    animate: "animate-pulse",
  },
  archived: {
    dot: "bg-zinc-400",
    ring: "ring-zinc-400/30",
    pill: "border-zinc-400/25 bg-zinc-500/8 text-zinc-600",
    label: "Archived",
    animate: "",
  },
  scheduled: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/40",
    pill: "border-amber-500/20 bg-amber-500/10 text-amber-700",
    label: "Scheduled",
    animate: "animate-pulse",
  },
  draft: {
    dot: "bg-sky-500",
    ring: "ring-sky-500/30",
    pill: "border-sky-500/20 bg-sky-500/10 text-sky-700",
    label: "Draft",
    animate: "",
  },
};

export function BlogStatusBadge({
  status,
  className,
  compact,
}: {
  status: BlogStatus;
  className?: string;
  compact?: boolean;
}) {
  const c = config[status];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border px-1.5 py-1 shadow-sm",
          c.pill,
          className
        )}
        title={c.label}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-60",
              c.dot,
              c.animate
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full ring-2",
              c.dot,
              c.ring
            )}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-tight shadow-sm",
        c.pill,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75",
            c.dot,
            c.animate
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full ring-2",
            c.dot,
            c.ring
          )}
        />
      </span>
      {c.label}
    </span>
  );
}
