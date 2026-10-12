"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { timeAgo } from "@/lib/format";
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from "./hooks";
import { MentionInput } from "./mention-input";
import { extractMentionIds, splitMentions } from "./mentions";
import { commentSchema } from "./schemas";

export function TaskComments({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can, membershipId: myMembershipId } = useOrg();
  const { page } = useUrlState();
  const comments = useComments(o, projectId, taskId, page);
  const members = useMemberDirectory(o);
  const create = useCreateComment(o, projectId, taskId);
  const edit = useUpdateComment(o, projectId, taskId);
  const remove = useDeleteComment(o, projectId, taskId);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const moderator = can("comment:moderate");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = commentSchema.safeParse({ content: draft });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError(null);
    // Who gets notified is derived from the text as sent, so deleting "@Ben" before submitting can't still notify Ben.
    const mentionIds = extractMentionIds(parsed.data.content, members.list);
    const ok = await create.mutateAsync({ content: parsed.data.content, mentionedMembershipIds: mentionIds.length ? mentionIds : undefined }).then(() => true, () => false);
    if (ok) setDraft("");
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
              const mine = Boolean(myMembershipId && c.authorMembershipId === myMembershipId);
              return (
                <li key={c.id} className="flex gap-3">
                  <Avatar name={members.nameOf(c.authorMembershipId)} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm"><span className="font-medium">{members.nameOf(c.authorMembershipId)}</span> <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}{c.updatedAt && c.updatedAt !== c.createdAt ? " · edited" : ""}</span></p>
                    {editing === c.id ? (
                      <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const ok = await edit.mutateAsync({ id: c.id, content: draft }).then(() => true, () => false); if (ok) { setEditing(null); setDraft(""); } }}>
                        <Textarea aria-label="Edit comment" value={draft} onChange={(e) => setDraft(e.target.value)} />
                        <div className="flex gap-2"><Button size="sm" type="submit" loading={edit.isPending} disabled={!draft.trim()}>Save</Button><Button size="sm" variant="secondary" type="button" onClick={() => { setEditing(null); setDraft(""); }}>Cancel</Button></div>
                      </form>
                    ) : <p className="whitespace-pre-wrap break-words text-sm">{splitMentions(c.content, members.list.map((m) => m.name)).map((part, i) => part.mention ? <span key={i} className="rounded-sm bg-primary/10 px-0.5 font-medium text-primary">{part.text}</span> : part.text)}</p>}
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
      {can("comment:create") ? (
        <form onSubmit={submit} noValidate className="space-y-2">
          <MentionInput label="Write a comment" placeholder="Write a comment… type @ to mention a teammate" value={draft} onChange={setDraft} members={members.list} invalid={!!error} disabled={editing !== null} />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="ml-auto" loading={create.isPending} disabled={editing !== null}>Comment</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
