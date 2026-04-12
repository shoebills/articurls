import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardGate } from "@/components/dashboard-gate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardGate>
  );
}
