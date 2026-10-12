"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TASK_PRIORITIES, statusLabel } from "@/components/shared/status-badge";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { useSprints } from "@/features/projects/hooks";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { toDateInputValue } from "@/lib/format";
import type { Task } from "@/types/domain";
import { useCreateTask, useUpdateTask } from "./hooks";
import { buildTaskPayload } from "./task-payload";
import { taskSchema, type TaskValues } from "./schemas";

const FIELDS = ["title", "description", "priority", "assigneeMembershipId", "sprintId", "startDate", "dueDate"] as const;

/** Create or edit a task. Status is changed from the task page / list, not here. */
export function TaskFormDialog({ mode, projectId, task, open, onOpenChange }: {
  mode: "create" | "edit"; projectId: string; task?: Task; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const { organizationId: o } = useOrg();
  const members = useMemberDirectory(o);
  const sprints = useSprints(o, projectId);
  const create = useCreateTask(o, projectId);
  const update = useUpdateTask(o, projectId, task?.id ?? "");
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    values: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: (task?.priority as TaskValues["priority"] | undefined) ?? "MEDIUM",
      assigneeMembershipId: task?.assigneeMembershipId ?? "",
      sprintId: task?.sprintId ?? "",
      startDate: toDateInputValue(task?.startDate),
      dueDate: toDateInputValue(task?.dueDate),
    },
  });
  // Finished sprints are history: don't offer them for new work, but keep showing the one a task is already in.
  const sprintOptions = (sprints.data?.items ?? []).filter((s) => s.status !== "COMPLETED" || s.id === task?.sprintId);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title={mode === "create" ? "New task" : "Edit task"} description={mode === "create" ? "Describe the work, set its priority and optionally assign it." : "Update the details of this task."} />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (values) => {
          const built = buildTaskPayload(values, mode === "edit" ? task : undefined);
          if (!built.ok) { setError(built.field, { type: "server", message: built.message }); return; }
          try {
            if (mode === "create") await create.mutateAsync(built.payload); else await update.mutateAsync(built.payload);
            onOpenChange(false);
            reset();
          } catch (e) {
            for (const [field, message] of Object.entries(extractFieldErrors(e, FIELDS))) setError(field as (typeof FIELDS)[number], { type: "server", message });
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" autoFocus placeholder="Build login page" aria-invalid={!!errors.title} {...register("title")} />
            {errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="task-desc" aria-invalid={!!errors.description} {...register("description")} />
            {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" {...register("priority")}>{TASK_PRIORITIES.map((p) => <option key={p} value={p}>{statusLabel.priority(p)}</option>)}</Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select id="task-assignee" {...register("assigneeMembershipId")}>
                <option value="">Unassigned</option>
                {members.list.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-sprint">Sprint</Label>
            <Select id="task-sprint" {...register("sprintId")}>
              <option value="">No sprint (backlog)</option>
              {sprintOptions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === "ACTIVE" ? " (active)" : ""}</option>)}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-start">Start date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="task-start" type="date" aria-invalid={!!errors.startDate} {...register("startDate")} />
              {errors.startDate ? <p className="text-xs text-danger">{errors.startDate.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Due date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="task-due" type="date" aria-invalid={!!errors.dueDate} {...register("dueDate")} />
              {errors.dueDate ? <p className="text-xs text-danger">{errors.dueDate.message}</p> : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>{mode === "create" ? "Create task" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The "New task" button plus its dialog (used in the task list header and empty state). */
export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus /> New task</Button>
      <TaskFormDialog mode="create" projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  );
}
