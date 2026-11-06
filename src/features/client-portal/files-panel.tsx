"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, FolderOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FileUploader } from "@/components/shared/file-uploader";
import { Pagination } from "@/components/shared/pagination";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { fileTypeLabel, formatBytes, isImageType } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import type { SharedFile } from "@/types/domain";
import { useDeleteSharedFile, useProjectFiles, useUploadSharedFile } from "./hooks";

const PAGE_SIZE = 12;

/** Files shared with the client, from either side (each row says who uploaded it). */
export function FilesPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const { page } = useUrlState();
  const q = useProjectFiles(o, projectId, { page, limit: PAGE_SIZE });
  const upload = useUploadSharedFile(o, projectId);
  const del = useDeleteSharedFile(o, projectId);
  const [removing, setRemoving] = useState<SharedFile | null>(null);

  return (
    <div className="space-y-5">
      <Can permission="client-portal:manage"><FileUploader label="Share a file" onUpload={upload} /></Can>

      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading files">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load files" />
        : !q.data?.items.length ? <EmptyState icon={FolderOpen} title="No shared files" description="Files you share here are available to the client in their portal. Files they upload appear here too." />
        : (<>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.items.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                {isImageType(f.mimeType) ? <Image src={f.url} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-md border border-border object-cover" />
                  : <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"><FileText className="size-4" aria-hidden /></span>}
                <div className="min-w-0 flex-1">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">{f.originalFilename}<span className="sr-only"> (opens in a new tab)</span></a>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{fileTypeLabel(f.mimeType)} · {formatBytes(f.sizeBytes)} · {f.uploadedBy.name} <Badge tone={f.uploadedBy.type === "CLIENT" ? "info" : "neutral"}>{f.uploadedBy.type === "CLIENT" ? "Client" : "Team"}</Badge> · <time dateTime={f.createdAt}>{formatDateTime(f.createdAt)}</time></p>
                </div>
                <Can permission="client-portal:manage"><Button variant="ghost" size="icon" aria-label={`Remove ${f.originalFilename}`} onClick={() => setRemoving(f)}><Trash2 /></Button></Can>
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}

      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} destructive confirmLabel="Remove file" title={`Remove ${removing?.originalFilename ?? "file"}?`}
        description="It's deleted for everyone, including the client." onConfirm={() => removing && del.mutateAsync(removing.id)} />
    </div>
  );
}
