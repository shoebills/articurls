"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
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
  "Custom domain & automatic SSL",
  "Collect email subscribers",
  "Publish emails to subscribers",
  "Full views & subscriber analytics",
  "RSS, sitemap & robots control",
  "Remove Articurls branding",
  "Custom favicon",
  "Unlimited media storage",
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
      <DialogContent className="max-h-[min(88dvh,88vh)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border-primary/30 bg-gradient-to-b from-primary/[0.06] to-card p-0 ring-1 ring-primary/20 sm:max-w-md">
        <div className="p-6 sm:p-7">
          <DialogHeader className="space-y-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Grow audience</p>
            <DialogTitle className="mt-1.5 text-2xl font-semibold tracking-tight">Upgrade to Pro</DialogTitle>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">$9</span>
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Reach readers on your own domain and unlock everything you need to grow.
            </DialogDescription>
          </DialogHeader>

          <Button
            className="mt-6 h-12 w-full touch-manipulation shadow-md shadow-primary/20"
            onClick={() => router.push(upgradeHref("pro"))}
          >
            Start Pro — $9/mo
          </Button>

          <button
            type="button"
            onClick={() => router.push(upgradeHref("lifetime"))}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Or pay once — Lifetime for</span>
            <span className="font-medium text-foreground">$99</span>
            <span className="line-through">$149</span>
          </button>

          <div className="mt-6 border-t border-border/60 pt-6">
            <ul className="space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-foreground/80">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
