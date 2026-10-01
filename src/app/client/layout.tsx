import { PortalShell } from "@/components/client/portal-shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
