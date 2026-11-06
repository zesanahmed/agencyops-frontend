"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { extractFieldErrors } from "@/lib/api/field-errors";
import type { Client } from "@/types/domain";
import { useCreateClient, useUpdateClient } from "./hooks";
import { clientSchema, type ClientValues } from "./schemas";

export function ClientFormDialog({ mode, client, open, onOpenChange, onSaved }: {
  mode: "create" | "edit"; client?: Client; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (c: Client) => void;
}) {
  const { organizationId: o } = useOrg();
  const create = useCreateClient(o);
  const update = useUpdateClient(o, client?.id ?? "");
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    values: { name: client?.name ?? "", website: client?.website ?? "", notes: client?.notes ?? "" },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title={mode === "create" ? "New client" : "Edit client"} description="The company you do the work for. Add the people who can sign in to the client portal next." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          try {
            const saved = mode === "create" ? await create.mutateAsync(v) : await update.mutateAsync(v);
            onOpenChange(false);
            onSaved?.(saved);
          } catch (e) {
            const f = extractFieldErrors(e, ["name", "website", "notes"] as const);
            for (const [k, message] of Object.entries(f)) setError(k as keyof ClientValues, { type: "server", message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name</Label>
            <Input id="client-name" placeholder="Brightline Studio" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-website">Website <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="client-website" type="url" inputMode="url" placeholder="https://example.com" aria-invalid={!!errors.website} {...register("website")} />
            {errors.website ? <p className="text-xs text-danger">{errors.website.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Internal notes <span className="font-normal text-muted-foreground">(optional, never shown to the client)</span></Label>
            <Textarea id="client-notes" className="min-h-24" aria-invalid={!!errors.notes} {...register("notes")} />
            {errors.notes ? <p className="text-xs text-danger">{errors.notes.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>{mode === "create" ? "Add client" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
