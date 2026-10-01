"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PriorityBadge, TASK_PRIORITIES, TASK_STATUSES, TaskStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { useOrg } from "@/features/organizations/org-context";
import { useTask } from "@/features/projects/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { useUrlState } from "@/hooks/use-url-state";
import { timeAgo } from "@/lib/format";
import { commentSchema } from "./schemas";
import {
  useAddCollaborator, useAllMembers, useCollaborators, useComments, useCreateComment, useCreateSubtask,
  useDeleteComment, useDeleteTask, useRemoveCollaborator, useSubtasks, useUpdateComment, useUpdateTask,
} from "./hooks";

const subtaskSchema = z.object({ title: z.string().trim().min(2, "Title must be at least 2 characters").max(200) });

export function TaskDetail({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const router = useRouter();
  const task = useTask(o, projectId, taskId);
  const update = useUpdateTask(o, projectId, taskId);
  const del = useDeleteTask(o, projectId);
  const members = useAllMembers(o);
  const [confirming, setConfirming] = useState(false);
  const back = `/organizations/${o}/projects/${projectId}`;

  if (task.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-40" /><Skeleton className="h-48" /></div>;
  if (task.isError || !task.data) return <ErrorState error={task.error} onRetry={() => task.refetch()} title="Couldn't load this task" />;
  const t = task.data;
  const editable = can("task.update");

  return (
    <>
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to project</Link>
      <PageHeader title={t.title} eyebrow={<span className="flex items-center gap-2"><TaskStatusBadge status={t.status} /><PriorityBadge priority={t.priority} /></span>}
        description={t.description || undefined}
        actions={can("task.delete") ? <Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => setConfirming(true)}><Trash2 /></Button> : undefined} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-10">
          <Subtasks projectId={projectId} taskId={taskId} />
          <Comments projectId={projectId} taskId={taskId} />
        </div>
        <aside className="space-y-6 lg:border-l lg:border-border lg:pl-6" aria-label="Task details">
          <Field label="Status">
            <Select aria-label="Status" disabled={!editable || update.isPending} value={t.status} onChange={(e) => update.mutate({ status: e.target.value })}>
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{statusLabel.task(s)}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select aria-label="Priority" disabled={!editable || update.isPending} value={t.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>
              {TASK_PRIORITIES.map((s) => <option key={s} value={s}>{statusLabel.priority(s)}</option>)}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select aria-label="Assignee" disabled={!editable || update.isPending} value={t.assigneeMembershipId ?? ""} onChange={(e) => update.mutate({ assigneeMembershipId: e.target.value || undefined })}>
              <option value="">Unassigned</option>
              {members.data?.items.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Collaborators projectId={projectId} taskId={taskId} />
        </aside>
      </div>
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Delete this task?" description="The task, its subtasks and comments will be removed." confirmLabel="Delete task" destructive
        onConfirm={async () => { await del.mutateAsync(taskId); router.replace(back); }} />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}

function Subtasks({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const { data, isLoading, isError, error, refetch } = useSubtasks(o, projectId, taskId);
  const create = useCreateSubtask(o, projectId, taskId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ title: string }>({ resolver: zodResolver(subtaskSchema) });
  return (
    <section aria-labelledby="sub-h" className="space-y-3">
      <h2 id="sub-h" className="text-sm font-semibold">Subtasks {data ? <span className="font-normal text-muted-foreground">({data.length})</span> : null}</h2>
      {isLoading ? <Skeleton className="h-20" /> : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load subtasks" /> : (
        data?.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"><span className="truncate">{s.title}</span><TaskStatusBadge status={s.status} /></li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No subtasks. Split the work into smaller steps if it helps.</p>
      )}
      {can("task.create") ? (
        <form noValidate className="flex gap-2" onSubmit={handleSubmit(async (v) => { const ok = await create.mutateAsync(v.title).then(() => true, () => false); if (ok) reset(); })}>
          <div className="flex-1"><Input aria-label="New subtask title" placeholder="Add a subtask…" aria-invalid={!!errors.title} {...register("title")} />{errors.title ? <p className="mt-1 text-xs text-danger">{errors.title.message}</p> : null}</div>
          <Button type="submit" variant="secondary" loading={create.isPending}><Plus /> Add</Button>
        </form>
      ) : null}
    </section>
  );
}

function Collaborators({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const { data, isLoading } = useCollaborators(o, projectId, taskId);
  const all = useAllMembers(o);
  const add = useAddCollaborator(o, projectId, taskId);
  const remove = useRemoveCollaborator(o, projectId, taskId);
  const taken = new Set(data?.map((c) => c.membershipId));
  return (
    <Field label="Collaborators">
      {isLoading ? <Skeleton className="h-8" /> : data?.length ? (
        <ul className="space-y-1.5">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm"><Avatar name={c.name} size="sm" /><span className="flex-1 truncate">{c.name}</span>
              {can("task.update") ? <button className="rounded-sm p-1 text-muted-foreground hover:bg-surface-muted" aria-label={`Remove ${c.name}`} onClick={() => remove.mutate(c.id)}><X className="size-3.5" /></button> : null}</li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No collaborators.</p>}
      {can("task.update") ? (
        <Select aria-label="Add collaborator" value="" disabled={add.isPending} onChange={(e) => e.target.value && add.mutate(e.target.value)}>
          <option value="">Add collaborator…</option>
          {all.data?.items.filter((m) => !taken.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      ) : null}
    </Field>
  );
}

function Comments({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can, role } = useOrg();
  const { page } = useUrlState();
  const me = useAuthStore((s) => s.user);
  const comments = useComments(o, projectId, taskId, page);
  const members = useAllMembers(o);
  const create = useCreateComment(o, projectId, taskId);
  const edit = useUpdateComment(o, projectId, taskId);
  const remove = useDeleteComment(o, projectId, taskId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const myMembership = members.data?.items.find((m) => (me?.id && m.userId === me.id) || (me?.email && m.email === me.email));
  const moderator = role === "OWNER" || role === "MANAGER";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = commentSchema.safeParse({ content: draft });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError(null);
    const ok = await create.mutateAsync({ content: parsed.data.content, mentionedMembershipIds: mentions.length ? mentions : undefined }).then(() => true, () => false);
    if (ok) { setDraft(""); setMentions([]); }
  }

  return (
    <section aria-labelledby="com-h" className="space-y-4">
      <h2 id="com-h" className="text-sm font-semibold">Comments</h2>
      {comments.isLoading ? <Skeleton className="h-32" /> : comments.isError ? <ErrorState error={comments.error} onRetry={() => comments.refetch()} title="Couldn't load comments" /> : !comments.data?.items.length ? (
        <EmptyState icon={Pencil} title="No comments yet" description="Start the conversation. Mention a teammate to notify them." className="py-8" />
      ) : (
        <>
          <ul className="space-y-4">
            {comments.data.items.map((c) => {
              const mine = Boolean(myMembership && c.authorMembershipId === myMembership.id);
              return (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={c.authorName} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm"><span className="font-medium">{c.authorName}</span> <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}{c.updatedAt && c.updatedAt !== c.createdAt ? " · edited" : ""}</span></p>
                    {editing === c.id ? (
                      <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const ok = await edit.mutateAsync({ id: c.id, content: draft }).then(() => true, () => false); if (ok) { setEditing(null); setDraft(""); } }}>
                        <Textarea aria-label="Edit comment" value={draft} onChange={(e) => setDraft(e.target.value)} />
                        <div className="flex gap-2"><Button size="sm" type="submit" loading={edit.isPending} disabled={!draft.trim()}>Save</Button><Button size="sm" variant="secondary" type="button" onClick={() => { setEditing(null); setDraft(""); }}>Cancel</Button></div>
                      </form>
                    ) : <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>}
                    {editing !== c.id && (mine || moderator) ? (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {mine ? <button className="hover:text-foreground" onClick={() => { setEditing(c.id); setDraft(c.content); }}>Edit</button> : null}
                        <button className="hover:text-danger" onClick={() => remove.mutate(c.id)}>Delete</button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination meta={comments.data.meta} />
        </>
      )}
      {can("comment.create") ? (
        <form onSubmit={submit} noValidate className="space-y-2">
          <Textarea aria-label="Write a comment" placeholder="Write a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={!!error} disabled={editing !== null} />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Mention a teammate" value="" className="w-auto min-w-44" onChange={(e) => { const id = e.target.value; if (!id) return; const m = members.data?.items.find((x) => x.id === id); if (m && !mentions.includes(id)) { setMentions([...mentions, id]); setDraft((d) => `${d}${d && !d.endsWith(" ") ? " " : ""}@${m.name} `); } }}>
              <option value="">@ Mention…</option>
              {members.data?.items.filter((m) => !mentions.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
            {mentions.length ? <span className="text-xs text-muted-foreground">{mentions.length} mentioned</span> : null}
            <Button type="submit" className="ml-auto" loading={create.isPending} disabled={editing !== null}>Comment</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
