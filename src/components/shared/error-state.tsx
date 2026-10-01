"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function ErrorState({ error, onRetry, title = "Couldn't load this", className }: {
  error?: unknown; onRetry?: () => void; title?: string; className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-lg border border-danger/30 bg-danger-soft px-6 py-10 text-center", className)}>
      <AlertTriangle className="mb-3 size-5 text-danger" aria-hidden />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{error ? toErrorMessage(error) : "Something went wrong. Please try again."}</p>
      {onRetry ? <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
