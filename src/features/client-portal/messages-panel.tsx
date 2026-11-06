"use client";

import { useState } from "react";
import { MessagesSquare, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Can, useOrg } from "@/features/organizations/org-context";
import { timeAgo, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectMessage } from "@/types/domain";
import { useDeleteMessage, usePostMessage, useProjectMessages } from "./hooks";

const schema = z.object({ content: z.string().trim().min(1, "Message cannot be empty").max(5000, "Message is too long") });
type Values = z.infer<typeof schema>;
const PAGE_SIZE = 30;

/**
 * The client-facing thread, oldest first (that's how the API pages it). It opens on the LAST page so the newest messages
 * are in view, with buttons to walk back to older ones.
 */
export function MessagesPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  // The API pages oldest-first, so the newest messages are on the last page. Page 1 is fetched first to learn how many
  // pages there are (same cache entry as the view when there is only one); `override` is set when the user walks back.
  const [override, setOverride] = useState<number | null>(null);
  const first = useProjectMessages(o, projectId, { page: 1, limit: PAGE_SIZE });
  const totalPages = first.data?.meta.totalPages ?? 1;
  const current = Math.min(override ?? totalPages, totalPages);
  const q = useProjectMessages(o, projectId, { page: current, limit: PAGE_SIZE });
  const setPage = (n: number) => setOverride(n);
  const post = usePostMessage(o, projectId);
  const del = useDeleteMessage(o, projectId);
  const [removing, setRemoving] = useState<ProjectMessage | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { content: "" } });

  return (
    <div className="space-y-4">
      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading messages">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load messages" />
        : !q.data?.items.length ? <EmptyState icon={MessagesSquare} title="No messages yet" description="Messages here are a shared thread with the client's contacts. Start the conversation below." />
        : (<>
          {current > 1 ? <Button variant="ghost" size="sm" onClick={() => setPage(current - 1)}>Show older messages</Button> : null}
          <ul className="space-y-2" aria-label="Messages">
            {q.data.items.map((m) => {
              const client = m.author.type === "CLIENT";
              return (
                <li key={m.id} className={cn("max-w-[85%] rounded-lg border px-3 py-2", client ? "border-border bg-surface" : "ml-auto border-primary/30 bg-primary-soft")}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{m.author.name}</span>
                    <Badge tone={client ? "info" : "neutral"}>{client ? "Client" : "Team"}</Badge>
                    <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>{timeAgo(m.createdAt)}</time>
                    <Can permission="client-portal:manage"><button type="button" className="ml-auto text-muted-foreground hover:text-danger" aria-label={`Delete message from ${m.author.name}`} onClick={() => setRemoving(m)}><Trash2 className="size-3.5" aria-hidden /></button></Can>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.content}</p>
                </li>
              );
            })}
          </ul>
          {current < totalPages ? <Button variant="ghost" size="sm" onClick={() => setPage(current + 1)}>Show newer messages</Button> : null}
        </>)}

      <Can permission="client-portal:manage">
        <form noValidate className="space-y-2" onSubmit={handleSubmit(async (v) => { try { await post.mutateAsync(v.content); reset(); setOverride(null); } catch { /* toasted by the mutation */ } })}>
          <Label htmlFor="msg-content">Reply to the client</Label>
          <Textarea id="msg-content" className="min-h-20" aria-invalid={!!errors.content} {...register("content")} />
          {errors.content ? <p className="text-xs text-danger">{errors.content.message}</p> : null}
          <div className="flex justify-end"><Button type="submit" size="sm" loading={post.isPending}>Send message</Button></div>
        </form>
      </Can>

      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} destructive confirmLabel="Delete message" title="Delete this message?"
        description="It disappears from the thread for the client too." onConfirm={() => removing && del.mutateAsync(removing.id)} />
    </div>
  );
}
