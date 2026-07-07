"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ProUpgradeDialog } from "@/components/pro/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";

interface ProLockOverlayProps {
  children: React.ReactNode;
  isPro?: boolean;
  title: string;
  description: string;
}

export function ProLockOverlay({
  children,
  isPro: isProOverride,
  title,
  description,
}: ProLockOverlayProps) {
  const { isPro: authIsPro } = useAuth();
  const pro = isProOverride ?? authIsPro;
  const [dialogOpen, setDialogOpen] = useState(false);

  if (pro) return <>{children}</>;

  return (
    <>
      <div
        className="relative cursor-pointer"
        onClick={() => setDialogOpen(true)}
      >
        <div className="pointer-events-none select-none">
          {children}
        </div>
        <div className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.85)_70%)] backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_70%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_70%)]" />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="pointer-events-auto w-full max-w-[260px] rounded-xl border border-border/60 bg-white/05 px-5 py-4 text-center shadow-lg backdrop-blur-lg sm:max-w-[280px]">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
            <Button
              asChild
              size="sm"
              className="mt-3 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href="/dashboard/billing">Check plans</Link>
            </Button>
          </div>
        </div>
      </div>
      <ProUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
