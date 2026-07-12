"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-4 md:left-[14.25rem]">
          <div className="pointer-events-auto w-full max-w-[320px] rounded-2xl border border-primary/30 bg-white px-6 py-7 text-center ring-1 ring-primary/20 shadow-xl shadow-primary/10 sm:max-w-[340px]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
            <Button
              className="mt-6 h-11 w-full shadow-md shadow-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              Check plans
            </Button>
          </div>
        </div>
      </div>
      <ProUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
