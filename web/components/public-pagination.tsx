import { Button } from "@/components/ui/button";

export function PublicPagination({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-10 flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        data-button-radius="true"
        className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
        onClick={onPrev}
        disabled={currentPage <= 1}
      >
        Prev
      </Button>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Page {currentPage} of {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        data-button-radius="true"
        className="border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground h-8 min-h-0 px-3 py-1.5"
        onClick={onNext}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

export function PublicLoadMore({
  visibleCount,
  totalCount,
  onLoadMore,
  buttonVariant = "solid",
}: {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  buttonVariant?: string;
}) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Showing {visibleCount} of {totalCount}
      </p>
      <Button
        variant="default"
        size="sm"
        data-button-radius="true"
        data-button-variant={buttonVariant}
        className="h-9 gap-1.5 px-5 text-sm"
        onClick={onLoadMore}
      >
        Load more
      </Button>
    </div>
  );
}
