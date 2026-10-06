"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TASK_PRIORITIES, statusLabel } from "@/components/shared/status-badge";
import { useOrg } from "@/features/organizations/org-context";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useCreateTask } from "./hooks";
import { taskSchema, type TaskValues } from "./schemas";

export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const { organizationId } = useOrg();
  const [open, setOpen] = useState(false);
  const members = useMemberDirectory(organizationId);
  const create = useCreateTask(organizationId, projectId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskValues>({ resolver: zodResolver(taskSchema), defaultValues: { priority: "MEDIUM" } });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button><Plus /> New task</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader title="New task" description="Describe the work, set its priority and optionally assign it." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          const ok = await create.mutateAsync({ title: v.title, description: v.description || undefined, priority: v.priority, assigneeMembershipId: v.assigneeMembershipId || undefined }).then(() => true, () => false);
          if (ok) { setOpen(false); reset(); }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" autoFocus placeholder="Build login page" aria-invalid={!!errors.title} {...register("title")} />
            {errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="task-desc" {...register("description")} />
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
