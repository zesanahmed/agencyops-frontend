"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, CheckCheck, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SprintStatusBadge } from "@/components/shared/status-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useSprints, useTasks } from "@/features/projects/hooks";
import { orderSprints, sprintTaskProgress, timeElapsedPct } from "@/features/projects/project-metrics";
import { formatCalendarDate } from "@/lib/format";
import type { Sprint, Task } from "@/types/domain";
import { useCompleteSprint, useDeleteSprint, useStartSprint } from "./hooks";
import { SprintFormDialog } from "./sprint-form-dialog";

const TASK_PAGE = 100; // backend maximum page size; same params as the Overview so both share one cached request

export function SprintPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useSprints(o, projectId);
  const tasksQ = useTasks(o, projectId, { page: 1, limit: TASK_PAGE, sortBy: "createdAt", sortOrder: "desc" });
  const tasks: Task[] = (tasksQ.data?.items ?? []).filter((t) => !t.parentTaskId);
  const truncated = (tasksQ.data?.meta.total ?? 0) > (tasksQ.data?.items.length ?? 0);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState<Sprint | null>(null);
  const [editing, setEditing] = useState<Sprint | null>(null);
  const [deleting, setDeleting] = useState<Sprint | null>(null);
  const start = useStartSprint(o, projectId);
  const complete = useCompleteSprint(o, projectId);
  const remove = useDeleteSprint(o, projectId);

  if (isLoading) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load sprints" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Can permission="sprint:create"><Button onClick={() => setCreating(true)}><Plus /> New sprint</Button></Can></div>
      {truncated ? <p className="text-xs text-muted-foreground">Task counts are based on the {tasks.length} most recent tasks of {tasksQ.data?.meta.total}.</p> : null}
      {!data?.items.length ? (
        <EmptyState icon={CalendarRange} title="No sprints yet" description="Sprints time-box the work. Plan one with a goal and a date range." />
      ) : (
        <ul className="space-y-3">
          {orderSprints(data.items).map((s) => {
            const progress = sprintTaskProgress(tasks, s.id);
            const pct = s.status === "ACTIVE" ? timeElapsedPct(s.startDate, s.endDate) : null;
            return (
              <li key={s.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><h3 className="font-medium">{s.name}</h3><SprintStatusBadge status={s.status} /></div>
                    <p className="text-sm text-muted-foreground">{formatCalendarDate(s.startDate)} → {formatCalendarDate(s.endDate)}</p>
                    {s.goal ? <p className="text-sm">{s.goal}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    {s.status !== "COMPLETED" ? <Can permission="sprint:update"><Button size="sm" variant="ghost" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil /></Button></Can> : null}
                    {s.status === "PLANNED" ? (<>
                      <Can permission="sprint:update"><Button size="sm" variant="secondary" loading={start.isPending && start.variables === s.id} onClick={() => start.mutate(s.id)}><Play /> Start</Button></Can>
                      <Can permission="sprint:delete"><Button size="sm" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)}><Trash2 /></Button></Can>
                    </>) : null}
                    {s.status === "ACTIVE" ? <Can permission="sprint:update"><Button size="sm" onClick={() => setCompleting(s)}><CheckCheck /> Complete</Button></Can> : null}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {tasksQ.isLoading ? <Skeleton className="h-4 w-48" /> : progress.total ? (
                    <>
                      <Progress value={progress.pct} label={`${s.name} tasks done`} />
                      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{progress.done} of {progress.total} {progress.total === 1 ? "task" : "tasks"} done</span>
                        <Link className="underline-offset-2 hover:text-foreground hover:underline" href={`/organizations/${o}/projects/${projectId}?tab=tasks&sprint=${s.id}`}>View tasks</Link>
                      </p>
                    </>
                  ) : <p className="text-xs text-muted-foreground">No tasks in this sprint yet. Assign tasks to it from the task form.</p>}
                </div>
                {pct !== null ? (
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                    <p className="text-xs text-muted-foreground">{Math.round(pct)}% of the time window elapsed</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <SprintFormDialog mode="create" projectId={projectId} open={creating} onOpenChange={setCreating} />
      <SprintFormDialog mode="edit" projectId={projectId} sprint={editing ?? undefined} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
      <ConfirmDialog open={!!completing} onOpenChange={(v) => !v && setCompleting(null)} title={`Complete ${completing?.name ?? "sprint"}?`}
        description={(() => {
          const p = completing ? sprintTaskProgress(tasks, completing.id) : { total: 0, done: 0 };
          const open = p.total - p.done;
          return open > 0
            ? `${open} of ${p.total} ${p.total === 1 ? "task is" : "tasks are"} not done. They stay in this sprint; move them to another sprint from the task page. A completed sprint can't be reopened.`
            : "A completed sprint can't be reopened.";
        })()}
        confirmLabel="Complete sprint" onConfirm={() => complete.mutateAsync(completing!.id)} />
      <ConfirmDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)} title="Delete sprint?" description={`“${deleting?.name}” will be removed. Only planned sprints can be deleted.`} confirmLabel="Delete sprint" destructive onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </div>
  );
}
