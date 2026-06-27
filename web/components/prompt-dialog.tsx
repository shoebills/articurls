"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type PromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  submitLabel?: string;
  readOnly?: boolean;
  compact?: boolean;
};

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  defaultValue = "",
  onConfirm,
  submitLabel = "Confirm",
  readOnly = false,
  compact = false,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [copied, setCopied] = useState(false);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    const wasClosed = !prevOpenRef.current && open;
    prevOpenRef.current = open;
    if (wasClosed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(defaultValue);
      setCopied(false);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy failure
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={compact ? "w-auto max-w-sm rounded-md border bg-popover p-3 shadow-md" : undefined}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3 py-3">
          <div className="relative">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              readOnly={readOnly}
              className={`text-sm ${readOnly ? "pr-10" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !readOnly) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          {readOnly && copied && (
            <p className="text-xs text-muted-foreground">Copied!</p>
          )}
        </div>
        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={readOnly}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
