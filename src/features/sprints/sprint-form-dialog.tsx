"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { toDateInputValue } from "@/lib/format";
import type { Sprint } from "@/types/domain";
import { useCreateSprint, useUpdateSprint } from "./hooks";
import { buildSprintPayload } from "./sprint-payload";
import { sprintSchema, type SprintValues } from "./schemas";

const FIELDS = ["name", "goal", "startDate", "endDate"] as const;

/** Create or edit a sprint. Status changes (start/complete) are separate actions, not part of this form. */
export function SprintFormDialog({ mode, projectId, sprint, open, onOpenChange }: {
  mode: "create" | "edit"; projectId: string; sprint?: Sprint; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const { organizationId: o } = useOrg();
  const create = useCreateSprint(o, projectId);
  const update = useUpdateSprint(o, projectId, sprint?.id ?? "");
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<SprintValues>({
    resolver: zodResolver(sprintSchema),
    values: { name: sprint?.name ?? "", goal: sprint?.goal ?? "", startDate: toDateInputValue(sprint?.startDate), endDate: toDateInputValue(sprint?.endDate) },
  });
  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title={mode === "create" ? "New sprint" : "Edit sprint"} description={mode === "create" ? "Sprints are planned first, then started and completed." : "Change the name, goal or dates."} />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          const body = buildSprintPayload(v, mode === "edit");
          try {
            if (mode === "create") await create.mutateAsync(body); else await update.mutateAsync(body);
            onOpenChange(false);
          } catch (e) {
            for (const [field, message] of Object.entries(extractFieldErrors(e, FIELDS))) setError(field as (typeof FIELDS)[number], { type: "server", message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="sp-name">Name</Label>
            <Input id="sp-name" placeholder="Sprint 1" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-goal">Goal <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="sp-goal" className="min-h-16" placeholder="What should be true when this sprint ends?" aria-invalid={!!errors.goal} {...register("goal")} />
            {errors.goal ? <p className="text-xs text-danger">{errors.goal.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-start">Start</Label>
              <Input id="sp-start" type="date" aria-invalid={!!errors.startDate} {...register("startDate")} />
              {errors.startDate ? <p className="text-xs text-danger">{errors.startDate.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-end">End</Label>
              <Input id="sp-end" type="date" aria-invalid={!!errors.endDate} {...register("endDate")} />
              {errors.endDate ? <p className="text-xs text-danger">{errors.endDate.message}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{mode === "create" ? "Create sprint" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
