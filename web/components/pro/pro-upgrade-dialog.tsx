"use client";

import { useRouter } from "next/navigation";
import { Check, Flame, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { upgradeHref } from "@/lib/upgrade-href";

const BENEFITS = [
  "Custom domain & SSL",
  "Email subscribers",
  "Verification badge",
  "Remove branding",
];

export function ProUpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85dvh,85vh)] w-[calc(100vw-2rem)] max-w-sm rounded-2xl gap-3 p-4 sm:p-5">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-lg">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Unlock premium features and grow your blog faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {BENEFITS.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-sm font-medium">Monthly</p>
            <p className="text-xl font-bold">
              $9
              <span className="text-xs font-normal text-muted-foreground">/mo</span>
            </p>
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => router.push(upgradeHref("pro"))}
            >
              Get Pro
            </Button>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <div className="mx-auto mb-1 flex items-center justify-center gap-1 text-xs font-medium text-amber-700">
              <Flame className="h-3 w-3" /> 50 seats left
            </div>
            <p className="text-sm font-medium">Lifetime</p>
            <p className="text-xl font-bold">
              $99{" "}
              <span className="text-xs font-normal text-muted-foreground line-through">
                $149
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full border-amber-300"
              onClick={() => router.push(upgradeHref("lifetime"))}
            >
              Get Lifetime
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
