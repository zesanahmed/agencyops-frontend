"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error.digest ?? "app error"); }, [error]);
  return (
    <div className="mx-auto max-w-lg p-8">
      <ErrorState title="This page hit a problem" onRetry={reset} />
    </div>
  );
}
