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
  "Full reader & subscriber analytics",
  "Remove Articurls branding",
  "Verification badge",
];

export function ProUpgradeDialog({
  open,
  onOpenChange,
  feature,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}) {
  const router = useRouter();

  const benefits = feature
    ? [
        feature,
        ...BENEFITS.filter((b) => b.toLowerCase() !== feature.toLowerCase()),
      ]
    : BENEFITS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85dvh,85vh)] w-[calc(100vw-2rem)] max-w-sm rounded-2xl gap-3 p-4 sm:p-5">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-lg">
            {feature ? `${feature} is a Pro feature` : "Upgrade to Pro"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {feature
              ? "Upgrade to unlock it — plus everything below."
              : "Unlock premium features and grow your blog faster."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {benefits.map((benefit, i) => (
            <div
              key={benefit}
              className={`flex items-center gap-2 text-sm ${
                feature && i === 0 ? "font-semibold" : ""
              }`}
            >
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button
            className="h-11 w-full touch-manipulation"
            onClick={() => router.push(upgradeHref("pro"))}
          >
            Get Pro — $9/mo
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full touch-manipulation border-amber-300 text-amber-900 hover:bg-amber-50"
            onClick={() => router.push(upgradeHref("lifetime"))}
          >
            <Flame className="mr-1.5 h-4 w-4 text-amber-600" />
            Lifetime — $99{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground line-through">
              $149
            </span>
            <span className="ml-1.5 text-xs font-medium text-amber-700">
              50 seats left
            </span>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Cancel anytime · instant access
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
