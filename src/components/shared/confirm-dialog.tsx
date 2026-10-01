"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  confirmLabel?: string; destructive?: boolean; onConfirm: () => Promise<unknown> | unknown;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader title={title} description={description} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} loading={pending}
            onClick={async () => {
              setPending(true);
              try { await onConfirm(); onOpenChange(false); } catch { /* callers toast their own errors; keep dialog open */ } finally { setPending(false); }
            }}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
