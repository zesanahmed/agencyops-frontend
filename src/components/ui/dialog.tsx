"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, side = "center", ...props }: React.ComponentProps<typeof D.Content> & { side?: "center" | "right" }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
      <D.Content
        className={cn(
          "fixed z-50 border border-border bg-surface shadow-(--shadow-pop) focus:outline-none",
          side === "center" && "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg p-6",
          side === "right" && "inset-y-0 right-0 w-full max-w-md overflow-y-auto p-6",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 space-y-1 pr-6">
      <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
      {description ? <D.Description className="text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
    </div>
  );
}
