"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PriorityBadge, TASK_PRIORITIES, TASK_STATUSES, TaskStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { useSprints, useTask } from "@/features/projects/hooks";
import { taskSchedule } from "@/features/projects/project-metrics";
import { ScheduleBadge } from "@/features/projects/project-schedule-badge";
import { formatCalendarDate } from "@/lib/format";
import { useDeleteTask, useUpdateTask } from "./hooks";
import { TaskCollaborators } from "./task-collaborators";
import { TaskComments } from "./task-comments";
import { TaskField } from "./task-field";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskSubtasks } from "./task-subtasks";

export function TaskDetail({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const router = useRouter();
  const task = useTask(o, projectId, taskId);
  const sprints = useSprints(o, projectId);
  const update = useUpdateTask(o, projectId, taskId);
  const del = useDeleteTask(o, projectId);
  const members = useMemberDirectory(o);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const back = `/organizations/${o}/projects/${projectId}`;

  if (task.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-40" /><Skeleton className="h-48" /></div>;
  if (task.isError || !task.data) return <ErrorState error={task.error} onRetry={() => task.refetch()} title="Couldn't load this task" />;
  const t = task.data;
  const editable = can("task:update");
  const busy = update.isPending;
  // A finished sprint is history: not offered for new work, but still shown if this task already belongs to it.
  const sprintOptions = (sprints.data?.items ?? []).filter((s) => s.status !== "COMPLETED" || s.id === t.sprintId);

  return (
    <>
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to project</Link>
      <PageHeader title={t.title}
        eyebrow={<span className="flex flex-wrap items-center gap-2"><TaskStatusBadge status={t.status} /><PriorityBadge priority={t.priority} /><ScheduleBadge schedule={taskSchedule(t)} /></span>}
        description={t.description || undefined}
        actions={<>
          {editable ? <Button variant="secondary" size="icon" aria-label="Edit task" onClick={() => setEditing(true)}><Pencil /></Button> : null}
          {can("task:delete") ? <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => setConfirming(true)}><Trash2 /></Button> : null}
        </>} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-10">
          <TaskSubtasks projectId={projectId} taskId={taskId} />
          <TaskComments projectId={projectId} taskId={taskId} />
        </div>
        <aside className="space-y-6 lg:border-l lg:border-border lg:pl-6" aria-label="Task details">
          <TaskField label="Status">
            <Select aria-label="Status" disabled={!editable || busy} value={t.status} onChange={(e) => update.mutate({ status: e.target.value })}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel.task(s)}</option>)}
            </Select>
          </TaskField>
          <TaskField label="Priority">
            <Select aria-label="Priority" disabled={!editable || busy} value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>
              {TASK_PRIORITIES.map((s) => <option key={s} value={s}>{statusLabel.priority(s)}</option>)}
            </Select>
          </TaskField>
          <TaskField label="Assignee">
            <Select aria-label="Assignee" disabled={!editable || busy} value={t.assigneeMembershipId ?? ""} onChange={(e) => update.mutate({ assigneeMembershipId: e.target.value || null })}>
              <option value="">Unassigned</option>
              {members.list.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </TaskField>
          <TaskField label="Sprint">
            <Select aria-label="Sprint" disabled={!editable || busy} value={t.sprintId ?? ""} onChange={(e) => update.mutate({ sprintId: e.target.value || null })}>
              <option value="">No sprint (backlog)</option>
              {sprintOptions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === "ACTIVE" ? " (active)" : ""}</option>)}
            </Select>
          </TaskField>
          <TaskField label="Dates">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Start</dt><dd>{formatCalendarDate(t.startDate)}</dd>
              <dt className="text-muted-foreground">Due</dt><dd>{formatCalendarDate(t.dueDate)}</dd>
            </dl>
          </TaskField>
          <TaskCollaborators projectId={projectId} taskId={taskId} />
        </aside>
      </div>
      <TaskFormDialog mode="edit" projectId={projectId} task={t} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Delete this task?" description="The task, its subtasks and comments will be removed." confirmLabel="Delete task" destructive
        onConfirm={async () => { await del.mutateAsync(taskId); router.replace(back); }} />
    </>
  );
}
