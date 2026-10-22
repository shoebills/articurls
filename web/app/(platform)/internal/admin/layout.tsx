import { InternalAdminGate } from "@/components/internal-admin-gate";

export default function InternalAdminLayout({ children }: { children: React.ReactNode }) {
  return <InternalAdminGate>{children}</InternalAdminGate>;
}
