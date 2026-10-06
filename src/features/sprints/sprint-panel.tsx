"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarRange, Play, CheckCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SprintStatusBadge } from "@/components/shared/status-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useSprints } from "@/features/projects/hooks";
import { sprintApi } from "@/lib/api/services";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { sprintSchema, type SprintValues } from "@/features/tasks/schemas";
import type { Sprint } from "@/types/domain";

/** Fraction of the date range elapsed — a schedule signal, not task completion. */
function elapsedPct(s: Sprint): number | null {
  if (!s.startDate || !s.endDate) return null;
  const a = new Date(s.startDate).getTime();
  const b = new Date(s.endDate).getTime();
  if (!(b > a)) return null;
  return Math.max(0, Math.min(100, ((Date.now() - a) / (b - a)) * 100));
}

export function SprintPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useSprints(o, projectId);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Sprint | null>(null);
  const inv = [["organizations", o, "projects", projectId, "sprints"]];
  const start = useAction({ fn: (id: string) => sprintApi.start(o, projectId, id), invalidate: inv, success: "Sprint started" });
  const complete = useAction({ fn: (id: string) => sprintApi.complete(o, projectId, id), invalidate: inv, success: "Sprint completed" });
  const remove = useAction({ fn: (id: string) => sprintApi.remove(o, projectId, id), invalidate: inv, success: "Sprint deleted" });
  const create = useAction({ fn: (v: SprintValues) => sprintApi.create(o, projectId, { name: v.name, goal: v.goal || undefined, startDate: new Date(v.startDate).toISOString(), endDate: new Date(v.endDate).toISOString() }), invalidate: inv, success: "Sprint created" });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SprintValues>({ resolver: zodResolver(sprintSchema) });

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
            const pct = s.status === "ACTIVE" ? elapsedPct(s) : null;
            return (
              <li key={s.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2"><h3 className="font-medium">{s.name}</h3><SprintStatusBadge status={s.status} /></div>
                    <p className="text-sm text-muted-foreground">{formatDate(s.startDate)} → {formatDate(s.endDate)}</p>
                    {s.goal ? <p className="text-sm">{s.goal}</p> : null}
                  </div>
                  <div className="flex gap-2">
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

      <Dialog open={creating} onOpenChange={(v) => { setCreating(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader title="New sprint" description="Sprints are planned first, then started and completed." />
          <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => { const ok = await create.mutateAsync(v).then(() => true, () => false); if (ok) { setCreating(false); reset(); } })}>
            <div className="space-y-1.5"><Label htmlFor="sp-name">Name</Label><Input id="sp-name" placeholder="Sprint 1" {...register("name")} aria-invalid={!!errors.name} />{errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}</div>
            <div className="space-y-1.5"><Label htmlFor="sp-goal">Goal <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="sp-goal" className="min-h-16" {...register("goal")} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="sp-start">Start</Label><Input id="sp-start" type="date" {...register("startDate")} aria-invalid={!!errors.startDate} />{errors.startDate ? <p className="text-xs text-danger">{errors.startDate.message}</p> : null}</div>
              <div className="space-y-1.5"><Label htmlFor="sp-end">End</Label><Input id="sp-end" type="date" {...register("endDate")} aria-invalid={!!errors.endDate} />{errors.endDate ? <p className="text-xs text-danger">{errors.endDate.message}</p> : null}</div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create sprint</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)} title="Delete sprint?" description={`“${deleting?.name}” will be removed. Only planned sprints can be deleted.`} confirmLabel="Delete sprint" destructive onConfirm={() => remove.mutateAsync(deleting!.id)} />
    </div>
  );
}
