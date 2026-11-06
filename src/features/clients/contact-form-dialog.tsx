"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { ApiError } from "@/lib/api/errors";
import { extractFieldErrors } from "@/lib/api/field-errors";
import type { ClientContact, ContactInviteResult } from "@/types/domain";
import { useCreateContact, useUpdateContact } from "./hooks";
import { contactSchema, type ContactValues } from "./schemas";

/** Add a portal contact (sends an invitation) or edit one (name and job title only: the e-mail can't change). */
export function ContactFormDialog({ clientId, mode, contact, open, onOpenChange, onInvited }: {
  clientId: string; mode: "create" | "edit"; contact?: ClientContact; open: boolean; onOpenChange: (open: boolean) => void; onInvited?: (r: ContactInviteResult) => void;
}) {
  const { organizationId: o } = useOrg();
  const create = useCreateContact(o, clientId);
  const update = useUpdateContact(o, clientId);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    values: { name: contact?.name ?? "", email: contact?.email ?? "", jobTitle: contact?.jobTitle ?? "" },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title={mode === "create" ? "Add a contact" : "Edit contact"} description={mode === "create" ? "They'll get an e-mail to set a password and sign in to the client portal." : "Change how this person is shown. Their e-mail address can't be changed."} />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          try {
            if (mode === "create") {
              const r = await create.mutateAsync(v);
              onOpenChange(false); reset();
              onInvited?.(r);
            } else { await update.mutateAsync({ contactId: contact!.id, values: v }); onOpenChange(false); }
          } catch (e) {
            const f = extractFieldErrors(e, ["name", "email", "jobTitle"] as const);
            for (const [k, message] of Object.entries(f)) setError(k as keyof ContactValues, { type: "server", message });
            // A duplicate address is a 409 on the e-mail, not a validation error.
            if (e instanceof ApiError && e.status === 409) setError("email", { type: "server", message: e.message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" autoFocus autoComplete="off" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" autoComplete="off" readOnly={mode === "edit"} aria-invalid={!!errors.email} {...register("email")} />
            {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-title">Job title <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="contact-title" autoComplete="off" aria-invalid={!!errors.jobTitle} {...register("jobTitle")} />
            {errors.jobTitle ? <p className="text-xs text-danger">{errors.jobTitle.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>{mode === "create" ? "Send invitation" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
