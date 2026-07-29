import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddItemSelect({
  placeholder,
  items,
  selectedValue,
  onValueChange,
  onAdd,
  addLabel,
  disabled,
  emptyStateText,
}: {
  placeholder: string;
  items: Array<{ value: string; label: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  onAdd: () => void;
  addLabel: string;
  disabled?: boolean;
  emptyStateText?: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger className="sm:flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.length > 0 ? (
            items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))
          ) : (
            <div className="flex min-h-[56px] flex-col items-center justify-center rounded-lg border border-dashed mx-1 px-4 py-3 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {emptyStateText ?? "No items available."}
              </p>
            </div>
          )}
        </SelectContent>
      </Select>
      <Button
        variant="default"
        disabled={disabled || !selectedValue}
        onClick={onAdd}
      >
        {addLabel}
      </Button>
    </div>
  );
}
