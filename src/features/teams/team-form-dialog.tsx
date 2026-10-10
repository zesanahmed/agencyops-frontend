"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/errors";
import { useOrg } from "@/features/organizations/org-context";
import type { Team } from "@/types/domain";
import { useCreateTeam, useUpdateTeam } from "./hooks";
import { teamSchema, type TeamValues } from "./schemas";

/** Create or edit a team. The backend enforces unique names per organization (409); it's shown on the Name field. */
export function TeamFormDialog({ mode, team, open, onOpenChange, onSaved }: {
  mode: "create" | "edit"; team?: Team; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: (team: Team) => void;
}) {
  const { organizationId: o } = useOrg();
  const create = useCreateTeam(o);
  const update = useUpdateTeam(o, team?.id ?? "");
  const pending = create.isPending || update.isPending;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TeamValues>({
    resolver: zodResolver(teamSchema),
    values: { name: team?.name ?? "", description: team?.description ?? "" },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title={mode === "create" ? "New team" : "Edit team"} description={mode === "create" ? "Give the team a name and say what it owns. You can add people next." : "Rename the team or change what it owns."} />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          try {
            const saved = mode === "create" ? await create.mutateAsync(v) : await update.mutateAsync(v);
            onOpenChange(false);
            onSaved?.(saved);
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) setError("name", { type: "server", message: e.message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" placeholder="Backend team" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="team-desc" className="min-h-20" aria-invalid={!!errors.description} {...register("description")} />
            {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{mode === "create" ? "Create team" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
