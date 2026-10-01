"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toErrorMessage } from "@/lib/api/errors";
import { useCreateOrganization } from "./hooks";
import { organizationSchema, type OrganizationValues } from "./schemas";

export function CreateOrganizationDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateOrganization();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<OrganizationValues>({ resolver: zodResolver(organizationSchema) });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus /> New organization</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader title="Create organization" description="An organization is your agency's workspace. You'll be its owner." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ name }) => {
          try {
            const org = await create.mutateAsync(name);
            toast.success(`${org.name} created`);
            setOpen(false);
            router.push(`/organizations/${org.id}`);
          } catch (e) { toast.error(toErrorMessage(e)); }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" placeholder="Acme Studio" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create organization</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
