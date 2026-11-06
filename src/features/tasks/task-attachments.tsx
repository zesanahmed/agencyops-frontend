"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { FileUploader, type UploadHandlers } from "@/components/shared/file-uploader";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { attachmentApi } from "@/lib/api/services";
import { fileTypeLabel, formatBytes, isImageType } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";
import type { TaskAttachment } from "@/types/domain";

/** Files attached to a task. Anyone who can read tasks sees them; uploading and deleting need task:update. */
export function TaskAttachments({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const authed = useAuthStore((s) => s.status === "authenticated");
  const qc = useQueryClient();
  const members = useMemberDirectory(o);
  const key = qk.attachments(o, projectId, taskId);
  const q = useQuery({ queryKey: key, queryFn: () => attachmentApi.list(o, projectId, taskId), enabled: authed });
  const del = useAction({ fn: (id: string) => attachmentApi.remove(o, projectId, taskId, id), invalidate: [key], success: "Attachment removed" });
  const [removing, setRemoving] = useState<TaskAttachment | null>(null);
  const editable = can("task:update");

  const upload = async (file: File, h: UploadHandlers) => {
    const a = await attachmentApi.upload(o, projectId, taskId, file, { onProgress: h.onProgress, signal: h.signal });
    await qc.invalidateQueries({ queryKey: key });
    return a;
  };
  const who = (membershipId: string) => members.list.find((m) => m.id === membershipId)?.name ?? "A former member";

  return (
    <section aria-labelledby="att-h" className="space-y-3">
      <h2 id="att-h" className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4 text-muted-foreground" aria-hidden /> Attachments{q.data?.length ? <span className="font-normal text-muted-foreground">({q.data.length})</span> : null}</h2>
      {q.isLoading ? <Skeleton className="h-14" />
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load attachments" />
        : !q.data?.length ? <p className="text-sm text-muted-foreground">No files attached yet.</p>
        : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                {isImageType(a.mimeType) ? <Image src={a.url} alt="" width={36} height={36} unoptimized className="size-9 shrink-0 rounded-md border border-border object-cover" />
                  : <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"><FileText className="size-4" aria-hidden /></span>}
                <div className="min-w-0 flex-1">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">{a.originalFilename}<span className="sr-only"> (opens in a new tab)</span></a>
                  <p className="truncate text-xs text-muted-foreground">{fileTypeLabel(a.mimeType)} · {formatBytes(a.sizeBytes)} · {who(a.uploadedByMembershipId)} · <time dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time></p>
                </div>
                {editable ? <Button variant="ghost" size="icon" aria-label={`Remove ${a.originalFilename}`} onClick={() => setRemoving(a)}><Trash2 /></Button> : null}
              </li>
            ))}
          </ul>
        )}
      {editable ? <FileUploader label="Attach a file" onUpload={upload} /> : null}
      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} destructive confirmLabel="Remove file" title={`Remove ${removing?.originalFilename ?? "file"}?`}
        description="The file is deleted permanently." onConfirm={() => removing && del.mutateAsync(removing.id)} />
    </section>
  );
}
