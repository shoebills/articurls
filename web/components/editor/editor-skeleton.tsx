"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="mb-1">
        <Skeleton className="h-9 w-3/4 sm:h-10 md:h-11 lg:h-12" />
        <Skeleton className="mt-1 h-9 w-1/2 sm:h-10 md:h-11 lg:h-12" />
      </div>

      <div className="mb-3 h-4" />

      <Skeleton className="h-64 w-full rounded-lg" />

      <div className="mt-6 rounded-lg border border-border bg-background">
        <Skeleton className="h-10 w-full" />
      </div>

      <hr className="my-8 border-border/70" />

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
