import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardGate } from "@/components/dashboard-gate";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardGate>
  );
}
