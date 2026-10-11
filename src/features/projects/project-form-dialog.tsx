"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { ApiError } from "@/lib/api/errors";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { toDateInputValue } from "@/lib/format";
import type { Project } from "@/types/domain";
import { useCreateProject, useUpdateProject } from "./hooks";
import { buildProjectPayload } from "./project-payload";
import { projectSchema, type ProjectValues } from "./schemas";

const FIELDS = ["name", "description", "startDate", "dueDate"] as const;

/**
 * Create or edit a project. The backend derives a unique slug from the name, so a duplicate name
 * comes back as a 409 and is shown on the Name field.
 */
export function ProjectFormDialog({ mode, project, open, onOpenChange }: {
  mode: "create" | "edit"; project?: Project; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const create = useCreateProject(o);
  const update = useUpdateProject(o, project?.id ?? "");
  const pending = create.isPending || update.isPending;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    values: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      startDate: toDateInputValue(project?.startDate),
      dueDate: toDateInputValue(project?.dueDate),
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader
          title={mode === "create" ? "New project" : "Edit project"}
          description={mode === "create" ? "A project holds sprints, tasks and the people working on them." : "Update the name, description or schedule."}
        />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (values) => {
          const built = buildProjectPayload(values, mode === "edit" ? project : undefined);
          if (!built.ok) { setError(built.field, { type: "server", message: built.message }); return; }
          try {
            if (mode === "create") {
              const created = await create.mutateAsync(built.payload);
              onOpenChange(false);
              reset();
              router.push(`/organizations/${o}/projects/${created.id}`);
            } else {
              await update.mutateAsync(built.payload);
              onOpenChange(false);
            }
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
              setError("name", { type: "server", message: "A project with this name already exists in the organization" });
              return;
            }
            for (const [field, message] of Object.entries(extractFieldErrors(e, FIELDS))) setError(field as (typeof FIELDS)[number], { type: "server", message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" placeholder="Website redesign" autoFocus aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="project-description" placeholder="What is this project delivering?" aria-invalid={!!errors.description} {...register("description")} />
            {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="project-start">Start date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="project-start" type="date" aria-invalid={!!errors.startDate} {...register("startDate")} />
              {errors.startDate ? <p className="text-xs text-danger">{errors.startDate.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-due">Due date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="project-due" type="date" aria-invalid={!!errors.dueDate} {...register("dueDate")} />
              {errors.dueDate ? <p className="text-xs text-danger">{errors.dueDate.message}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{mode === "create" ? "Create project" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The "New project" button plus its dialog (used in the page header and the empty state). */
export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus /> New project</Button>
      <ProjectFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </>
  );
}
