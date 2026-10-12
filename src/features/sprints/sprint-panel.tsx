"use client";

import { useState } from "react";
import { CalendarRange, CheckCheck, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SprintStatusBadge } from "@/components/shared/status-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useSprints } from "@/features/projects/hooks";
import { timeElapsedPct } from "@/features/projects/project-metrics";
import { formatCalendarDate } from "@/lib/format";
import type { Sprint } from "@/types/domain";
import { useCompleteSprint, useDeleteSprint, useStartSprint } from "./hooks";
import { SprintFormDialog } from "./sprint-form-dialog";

export function SprintPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useSprints(o, projectId);
  const [creating, setCreating] = useState(false);
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
      {!data?.items.length ? (
        <EmptyState icon={CalendarRange} title="No sprints yet" description="Sprints time-box the work. Plan one with a goal and a date range." />
      ) : (
        <ul className="space-y-3">
          {data.items.map((s) => {
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
                    {s.status === "ACTIVE" ? <Can permission="sprint:update"><Button size="sm" loading={complete.isPending && complete.variables === s.id} onClick={() => complete.mutate(s.id)}><CheckCheck /> Complete</Button></Can> : null}
                  </div>
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
      <ConfirmDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)} title="Delete sprint?" description={`“${deleting?.name}” will be removed. Only planned sprints can be deleted.`} confirmLabel="Delete sprint" destructive onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </div>
  );
}
