import { PortalShell } from "@/components/client/portal-shell";
import { PortalGate } from "@/features/portal/portal-gate";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalGate><PortalShell>{children}</PortalShell></PortalGate>;
}
