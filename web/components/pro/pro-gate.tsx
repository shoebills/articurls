"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProUpgradeDialog } from "@/components/pro/pro-upgrade-dialog";

interface ProGateProps {
  children: React.ReactNode;
  isPro?: boolean;
  feature?: string;
}

export function ProGate({ children, isPro: isProOverride, feature }: ProGateProps) {
  const { isPro: authIsPro } = useAuth();
  const isPro = isProOverride ?? authIsPro;
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isPro) return <>{children}</>;

  return (
    <>
      <div className="relative" onClick={() => setDialogOpen(true)}>
        <div className="absolute inset-0 z-10 cursor-pointer" />
        {children}
      </div>
      <ProUpgradeDialog open={dialogOpen} onOpenChange={setDialogOpen} feature={feature} />
    </>
  );
}
