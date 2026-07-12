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
      <DialogContent
        style={{
          backgroundColor: "white",
        }}
        className="max-h-[min(90dvh,90vh)] w-[calc(100vw-1.5rem)] max-w-sm gap-0 overflow-y-auto rounded-2xl border-primary/30 p-5 shadow-xl shadow-primary/10 ring-1 ring-primary/20 sm:max-w-md sm:p-7"
      >
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-transparent to-gray-400/20" />

          <DialogHeader className="relative z-10 space-y-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary sm:text-xs">Grow audience</p>
            <DialogTitle className="mt-1 text-xl font-semibold tracking-tight sm:mt-1.5 sm:text-2xl">Upgrade to Pro</DialogTitle>
            <DialogDescription className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground sm:mt-3 sm:text-sm">
              Reach readers on your own domain and unlock everything you need to grow.
            </DialogDescription>
          </DialogHeader>

          <ul className="relative z-10 mt-4 space-y-2 sm:mt-6 sm:space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-[0.8125rem] sm:text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="text-foreground/80">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="relative z-10 mt-5 space-y-2 sm:mt-6 sm:space-y-2.5">
            <Button
              className="h-11 w-full touch-manipulation shadow-md shadow-primary/20 sm:h-12"
              onClick={() => router.push(upgradeHref("pro"))}
            >
              Start Pro — $9/mo
            </Button>
            <div className="flex items-center gap-3 py-0.5">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="outline"
              className="h-11 w-full touch-manipulation gap-1.5 sm:h-12"
              onClick={() => router.push(upgradeHref("lifetime"))}
            >
              Get Lifetime — $99
              <span className="text-xs text-muted-foreground line-through">$149</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
