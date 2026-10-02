"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import { useAuth } from "./auth-provider";

/** Blocks protected UI until the session is restored; redirects to /login otherwise. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = useAuthStore((s) => s.signedOut);

  useEffect(() => {
    if (status === "anonymous") router.replace(signedOut ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname, signedOut]);

  if (status === "unavailable")
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <div className="w-full max-w-md">
          <ErrorState title="Can't reach AgencyOps right now" error={new TypeError("offline")} onRetry={() => void retry()} />
        </div>
      </div>
    );

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8" role="status" aria-label="Restoring your session">
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
