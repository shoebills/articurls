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
  "Publish emails to subscribers",
  "Collect email subscribers",
  "Full reader & subscriber analytics",
  "Remove Articurls branding",
  "Custom favicon",
  "Unlimited media storage",
  "RSS, sitemap & robots control",
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
      <DialogContent className="max-h-[min(85dvh,85vh)] w-[calc(100vw-2rem)] max-w-[19rem] rounded-2xl gap-2.5 p-[1.125rem] sm:max-w-sm sm:gap-3 sm:p-[1.875rem]">
        <DialogHeader className="space-y-1.5 sm:space-y-3">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 sm:h-11 sm:w-11">
            <Sparkles className="h-4 w-4 text-amber-600 sm:h-5 sm:w-5" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm">
            Access advanced features and grow your blog.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2 sm:mt-0 sm:space-y-1.5">
          {BENEFITS.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 sm:h-5 sm:w-5">
                <Check className="h-2.5 w-2.5 text-emerald-600 sm:h-3 sm:w-3" />
              </span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-1.5 sm:mt-0 sm:space-y-2">
          <Button
            className="h-9 w-full touch-manipulation text-xs sm:h-11 sm:text-sm"
            onClick={() => router.push(upgradeHref("pro"))}
          >
            Get Pro Features— $9/mo
          </Button>
          <div className="flex items-center gap-2 py-0.5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            className="h-9 w-full touch-manipulation border-amber-300 text-xs text-amber-900 hover:bg-amber-50 sm:h-11 sm:text-sm"
            onClick={() => router.push(upgradeHref("lifetime"))}
          >
            <Flame className="mr-1.5 h-3.5 w-3.5 text-amber-600 sm:h-4 sm:w-4" />
            Lifetime — $99{" "}
            <span className="ml-1 text-[0.625rem] font-normal text-muted-foreground line-through sm:text-xs">
              $149
            </span>
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-amber-700 sm:text-xs">
              50 seats left
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
