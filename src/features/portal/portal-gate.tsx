"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { PORTAL_LOGIN_PATH, usePortalAuth } from "./portal-auth-provider";

/** Blocks portal pages until the contact's session is restored; otherwise sends them to the portal sign-in. */
export function PortalGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = usePortalAuth();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = usePortalAuthStore((s) => s.signedOut);

  useEffect(() => {
    if (status === "anonymous") router.replace(signedOut ? PORTAL_LOGIN_PATH : `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname, signedOut]);

  if (status === "unavailable")
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="w-full max-w-md"><ErrorState title="Can't reach the portal right now" error={new TypeError("offline")} onRetry={() => void retry()} /></div>
      </div>
    );
  if (status !== "authenticated")
    return (
      <div className="flex min-h-dvh items-center justify-center p-8" role="status" aria-label="Restoring your session">
        <div className="w-full max-w-sm space-y-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      </div>
    );
  return <>{children}</>;
}
