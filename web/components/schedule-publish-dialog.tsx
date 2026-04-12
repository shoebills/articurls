"use client";

import { useEffect, useState } from "react";
import { addMinutes, isAfter } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultOpenValue(): string {
  const d = addMinutes(new Date(), 60);
  d.setSeconds(0, 0);
  return toDatetimeLocalValue(d);
}

export type SchedulePublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (isoUtc: string) => void | Promise<void>;
};

export function SchedulePublishDialog({ open, onOpenChange, onConfirm }: SchedulePublishDialogProps) {
  const [scheduleAt, setScheduleAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setScheduleAt(defaultOpenValue());
    }
  }, [open]);

  const parsed = scheduleAt ? new Date(scheduleAt) : null;
  const isValidFuture = parsed != null && !Number.isNaN(parsed.getTime()) && isAfter(parsed, addMinutes(new Date(), 1));

  async function handleConfirm() {
    if (!isValidFuture || !parsed) return;
    setSubmitting(true);
    try {
      await onConfirm(parsed.toISOString());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule publish</DialogTitle>
          <DialogDescription>
            Pick a date and time. This uses your device&apos;s local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}
            ).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="schedule-at">Date and time</Label>
          <Input
            id="schedule-at"
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="font-mono text-sm tabular-nums"
          />
          {scheduleAt && !isValidFuture && (
            <p className="text-sm text-destructive" role="alert">
              Choose a time at least a few minutes from now.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!isValidFuture || submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
