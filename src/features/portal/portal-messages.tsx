"use client";

import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalMessages, usePostPortalMessage } from "./hooks";
import { usePortalAuth } from "./portal-auth-provider";

const schema = z.object({ content: z.string().trim().min(1, "Message cannot be empty").max(5000, "Message is too long") });
type Values = z.infer<typeof schema>;
const PAGE_SIZE = 30;

/** The shared thread with the agency, oldest first; opens on the last page so the newest messages are in view. */
export function PortalMessages({ projectId }: { projectId: string }) {
  const { contact } = usePortalAuth();
  const [override, setOverride] = useState<number | null>(null);
  const first = usePortalMessages(projectId, { page: 1, limit: PAGE_SIZE });
  const totalPages = first.data?.meta.totalPages ?? 1;
  const current = Math.min(override ?? totalPages, totalPages);
  const q = usePortalMessages(projectId, { page: current, limit: PAGE_SIZE });
  const post = usePostPortalMessage(projectId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { content: "" } });

  return (
    <div className="space-y-4">
      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading messages">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load messages" />
        : !q.data?.items.length ? <EmptyState icon={MessagesSquare} title="No messages yet" description="Ask a question or share a thought. Your agency's team sees it here." />
        : (<>
          {current > 1 ? <Button variant="ghost" size="sm" onClick={() => setOverride(current - 1)}>Show older messages</Button> : null}
          <ul className="space-y-2" aria-label="Messages">
            {q.data.items.map((m) => {
              const mine = m.author.type === "CLIENT" && m.author.name === contact?.name;
              return (
                <li key={m.id} className={cn("max-w-[85%] rounded-lg border px-3 py-2", mine ? "ml-auto border-primary/30 bg-primary-soft" : "border-border bg-surface")}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{mine ? "You" : m.author.name}</span>
                    {m.author.type === "STAFF" ? <Badge tone="neutral">Agency</Badge> : null}
                    <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>{timeAgo(m.createdAt)}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.content}</p>
                </li>
              );
            })}
          </ul>
          {current < totalPages ? <Button variant="ghost" size="sm" onClick={() => setOverride(current + 1)}>Show newer messages</Button> : null}
        </>)}

      <form noValidate className="space-y-2" onSubmit={handleSubmit(async (v) => { try { await post.mutateAsync(v.content); reset(); setOverride(null); } catch { /* toasted by the mutation */ } })}>
        <Label htmlFor="portal-msg">Write a message</Label>
        <Textarea id="portal-msg" className="min-h-20" aria-invalid={!!errors.content} {...register("content")} />
        {errors.content ? <p className="text-xs text-danger">{errors.content.message}</p> : null}
        <div className="flex justify-end"><Button type="submit" size="sm" loading={post.isPending}>Send</Button></div>
      </form>
    </div>
  );
}
