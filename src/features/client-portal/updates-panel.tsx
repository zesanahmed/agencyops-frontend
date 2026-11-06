"use client";

import { useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { formatDateTime } from "@/lib/format";
import type { ProjectUpdate } from "@/types/domain";
import { useDeleteUpdate, usePostUpdate, useProjectUpdates } from "./hooks";

// Mirrors createUpdateSchema: title 1–200, body 1–10000.
const schema = z.object({ title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"), body: z.string().trim().min(1, "Write the update").max(10000, "Update is too long") });
type Values = z.infer<typeof schema>;
const PAGE_SIZE = 10;

/** Progress notes the client sees on their portal. Posting and deleting need client-portal:manage. */
export function UpdatesPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const { page } = useUrlState();
  const q = useProjectUpdates(o, projectId, { page, limit: PAGE_SIZE });
  const post = usePostUpdate(o, projectId);
  const del = useDeleteUpdate(o, projectId);
  const [removing, setRemoving] = useState<ProjectUpdate | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", body: "" } });

  return (
    <div className="space-y-5">
      <Can permission="client-portal:manage">
        <form noValidate className="space-y-3 rounded-lg border border-border bg-surface p-4" onSubmit={handleSubmit(async (v) => {
          try { await post.mutateAsync(v); reset(); } catch (e) { for (const [k, message] of Object.entries(extractFieldErrors(e, ["title", "body"] as const))) setError(k as keyof Values, { type: "server", message }); }
        })}>
          <p className="text-sm font-medium">Post an update for the client</p>
          <div className="space-y-1.5"><Label htmlFor="upd-title">Title</Label><Input id="upd-title" placeholder="Sprint 2 shipped" aria-invalid={!!errors.title} {...register("title")} />{errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}</div>
          <div className="space-y-1.5"><Label htmlFor="upd-body">Details</Label><Textarea id="upd-body" className="min-h-24" aria-invalid={!!errors.body} {...register("body")} />{errors.body ? <p className="text-xs text-danger">{errors.body.message}</p> : null}</div>
          <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Visible to every contact with access to this project.</p><Button type="submit" size="sm" loading={post.isPending}>Post update</Button></div>
        </form>
      </Can>

      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading updates">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load updates" />
        : !q.data?.items.length ? <EmptyState icon={Megaphone} title="No updates yet" description="Share progress here and the client sees it on their portal." />
        : (<>
          <ul className="space-y-3">
            {q.data.items.map((u) => (
              <li key={u.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="font-medium leading-snug">{u.title}</h3><p className="text-xs text-muted-foreground">{u.author.name} · <time dateTime={u.createdAt}>{formatDateTime(u.createdAt)}</time></p></div>
                  <Can permission="client-portal:manage"><Button variant="ghost" size="icon" aria-label={`Delete update ${u.title}`} onClick={() => setRemoving(u)}><Trash2 /></Button></Can>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{u.body}</p>
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}

      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} destructive confirmLabel="Delete update" title="Delete this update?"
        description="The client will no longer see it on their portal." onConfirm={() => removing && del.mutateAsync(removing.id)} />
    </div>
  );
}
