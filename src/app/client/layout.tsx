import { PortalAuthProvider } from "@/features/portal/portal-auth-provider";

/** Everything under /client shares the portal's own session. The shell and the auth gate live in the (portal) group; /client/login sits outside it. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <PortalAuthProvider>{children}</PortalAuthProvider>;
}
