"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content sideOffset={sideOffset} className={cn("z-50 min-w-52 rounded-lg border border-border bg-surface p-1 shadow-(--shadow-pop)", className)} {...props} />
    </M.Portal>
  );
}

export function DropdownMenuItem({ className, danger, ...props }: React.ComponentProps<typeof M.Item> & { danger?: boolean }) {
  return (
    <M.Item className={cn("flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-muted [&_svg]:size-4 [&_svg]:text-muted-foreground", danger && "text-danger [&_svg]:text-danger", className)} {...props} />
  );
}

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof M.Label>) => (
  <M.Label className={cn("px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground", className)} {...props} />
);
export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof M.Separator>) => (
  <M.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);
