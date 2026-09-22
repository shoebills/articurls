"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUrl?: string;
  defaultNofollow?: boolean;
  onConfirm: (url: string, nofollow: boolean) => void;
}

function LinkDialogInner({
  open,
  onOpenChange,
  defaultUrl = "https://",
  defaultNofollow = false,
  onConfirm,
}: LinkDialogProps) {
  const [url, setUrl] = useState(defaultUrl || "https://");
  const [nofollow, setNofollow] = useState(defaultNofollow);

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirm(url.trim(), nofollow);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogDescription>Enter the URL and search indexing preferences.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="link-nofollow" className="text-sm font-medium cursor-pointer">
                Nofollow link
              </Label>
              <p className="text-xs text-muted-foreground">
                Add <code className="text-[11px] font-mono">rel=&quot;nofollow&quot;</code> to instruct search engines not to pass authority.
              </p>
            </div>
            <Switch
              id="link-nofollow"
              checked={nofollow}
              onCheckedChange={setNofollow}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {defaultUrl && defaultUrl !== "https://" ? "Update Link" : "Add Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LinkDialog(props: LinkDialogProps) {
  if (!props.open) return null;
  return <LinkDialogInner {...props} />;
}
