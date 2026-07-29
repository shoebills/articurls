import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export function SortableItem({
  id,
  disabled,
  name,
  children,
}: {
  id: number;
  disabled: boolean;
  name: string;
  children?: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 min-w-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="flex cursor-grab touch-none items-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="truncate text-sm">{name}</span>
      </div>
      {children}
    </div>
  );
}
