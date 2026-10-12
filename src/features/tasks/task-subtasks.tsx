"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { useOrg } from "@/features/organizations/org-context";
import { cn } from "@/lib/utils";
import { useCreateSubtask, useDeleteSubtask, useSubtasks, useUpdateSubtask } from "./hooks";

const subtaskSchema = z.object({ title: z.string().trim().min(1, "Title is required").max(300, "Title is too long") });

/**
 * A subtask is a task one level down. "Done" is a checkbox (DONE <-> TODO); finer status stays on the subtask's own record.
 * Adding needs task:create, ticking needs task:update, deleting needs task:delete (managers and owners only).
 */
export function TaskSubtasks({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const { data, isLoading, isError, error, refetch } = useSubtasks(o, projectId, taskId);
  const create = useCreateSubtask(o, projectId, taskId);
  const update = useUpdateSubtask(o, projectId, taskId);
  const remove = useDeleteSubtask(o, projectId, taskId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string }>({ resolver: zodResolver(subtaskSchema) });
  const done = data?.filter((s) => s.status === "DONE").length ?? 0;

  return (
    <section aria-labelledby="sub-h" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sub-h" className="text-sm font-semibold">Subtasks {data ? <span className="font-normal text-muted-foreground">({data.length})</span> : null}</h2>
        {data?.length ? <span className="text-xs text-muted-foreground">{done} of {data.length} done</span> : null}
      </div>
      {data?.length ? <Progress value={(done / data.length) * 100} label="Subtasks done" /> : null}
      {isLoading ? <Skeleton className="h-20" /> : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load subtasks" /> : (
        data?.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.map((s) => {
              const isDone = s.status === "DONE";
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <input type="checkbox" className="size-4 shrink-0 accent-[var(--color-primary)]" checked={isDone} disabled={!can("task:update") || update.isPending}
                    aria-label={`Mark “${s.title}” ${isDone ? "not done" : "done"}`} onChange={() => update.mutate({ id: s.id, status: isDone ? "TODO" : "DONE" })} />
                  <span className={cn("min-w-0 flex-1 truncate", isDone && "text-muted-foreground line-through")}>{s.title}</span>
                  <TaskStatusBadge status={s.status} />
                  {can("task:delete") ? <button type="button" className="rounded-sm p-1 text-muted-foreground hover:bg-surface-muted hover:text-danger" aria-label={`Delete subtask “${s.title}”`} onClick={() => remove.mutate(s.id)}><Trash2 className="size-3.5" /></button> : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No subtasks. Split the work into smaller steps if it helps.</p>
      )}
      {can("task:create") ? (
        <form noValidate className="flex gap-2" onSubmit={handleSubmit(async (v) => { const ok = await create.mutateAsync(v.title).then(() => true, () => false); if (ok) reset(); })}>
          <div className="flex-1"><Input aria-label="New subtask title" placeholder="Add a subtask…" aria-invalid={!!errors.title} {...register("title")} />{errors.title ? <p className="mt-1 text-xs text-danger">{errors.title.message}</p> : null}</div>
          <Button type="submit" variant="secondary" loading={create.isPending}><Plus /> Add</Button>
        </form>
      ) : null}
    </section>
  );
}
