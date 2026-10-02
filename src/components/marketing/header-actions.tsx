"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

/** Signed-in visitors get a way back into the workspace; anonymous ones get sign-in/sign-up. */
export function HeaderActions() {
  const { status } = useAuth();
  if (status === "unknown") return <div className="h-8 w-44" aria-hidden />; // reserve space: no layout shift
  // "unavailable" means a session probably exists but the server was unreachable: still offer the way back in.
  if (status === "authenticated" || status === "unavailable")
    return <Button asChild size="sm"><Link href="/organizations">Open workspace</Link></Button>;
  return (
    <>
      <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
      <Button asChild size="sm"><Link href="/register">Get started</Link></Button>
    </>
  );
}
