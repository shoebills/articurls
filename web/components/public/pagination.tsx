import { ChevronDown } from "lucide-react";
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
        size="default"
        data-button-radius="true"
        className="border-border/80 bg-background font-semibold shadow-sm hover:bg-muted hover:text-foreground"
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
        size="default"
        data-button-radius="true"
        className="border-border/80 bg-background font-semibold shadow-sm hover:bg-muted hover:text-foreground"
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
}: {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
}) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-10 flex justify-center">
      <Button
        variant="default"
        size="default"
        className="font-semibold shadow-xs"
        onClick={onLoadMore}
      >
        <ChevronDown className="h-4 w-4" />
        Load more
      </Button>
    </div>
  );
}
