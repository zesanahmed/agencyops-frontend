import { PortalAuthProvider } from "@/features/portal/portal-auth-provider";

/** /portal/* (e-mailed invitation links) share the portal session with /client/*. */
export default function PortalLinksLayout({ children }: { children: React.ReactNode }) {
  return <PortalAuthProvider>{children}</PortalAuthProvider>;
}
