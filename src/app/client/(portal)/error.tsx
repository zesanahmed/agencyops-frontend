"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

/** A crash inside the client portal stays inside it: the shell and the contact's session remain, with a retry. */
export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error.digest ?? "portal error"); }, [error]);
  return <ErrorState title="This page hit a problem" onRetry={reset} />;
}
