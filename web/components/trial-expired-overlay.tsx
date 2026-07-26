"use client";

import Link from "next/link";
import { TimerOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrialExpiredOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-sm px-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200/50">
          <TimerOff className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Your trial has ended
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your 14-day free trial is over. Subscribe to keep using Articurls with all features including custom domains, analytics, subscriber collection, and more.
        </p>
        <div className="mt-8 space-y-3">
          <Button asChild className="h-12 w-full gap-2 text-base shadow-md shadow-primary/20">
            <Link href="/dashboard/billing?plan=pro">
              <Zap className="h-4 w-4" />
              Subscribe — $9/mo
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/dashboard/billing?plan=lifetime">
              Get Lifetime — $99
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
