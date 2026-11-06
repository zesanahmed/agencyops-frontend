"use client";

import Image from "next/image";
import { FileText, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FileUploader } from "@/components/shared/file-uploader";
import { Pagination } from "@/components/shared/pagination";
import { useUrlState } from "@/hooks/use-url-state";
import { fileTypeLabel, formatBytes, isImageType } from "@/lib/files";
import { formatDateTime } from "@/lib/format";
import { usePortalFiles, useUploadPortalFile } from "./hooks";

const PAGE_SIZE = 12;

/** Files shared on one project, both directions. Contacts can upload; only the agency can remove files. */
export function PortalFiles({ projectId }: { projectId: string }) {
  const { page } = useUrlState();
  const q = usePortalFiles(projectId, { page, limit: PAGE_SIZE });
  const upload = useUploadPortalFile(projectId);
  return (
    <div className="space-y-5">
      <FileUploader label="Share a file with your agency" onUpload={upload} />
      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading files">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load files" />
        : !q.data?.items.length ? <EmptyState icon={FolderOpen} title="No files yet" description="Files you and your agency share on this project appear here." />
        : (<>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.items.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                {isImageType(f.mimeType) ? <Image src={f.url} alt="" width={40} height={40} unoptimized className="size-10 shrink-0 rounded-md border border-border object-cover" />
                  : <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"><FileText className="size-4" aria-hidden /></span>}
                <div className="min-w-0 flex-1">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:underline">{f.originalFilename}<span className="sr-only"> (opens in a new tab)</span></a>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">{fileTypeLabel(f.mimeType)} · {formatBytes(f.sizeBytes)} · {f.uploadedBy.name} {f.uploadedBy.type === "STAFF" ? <Badge tone="neutral">Agency</Badge> : null} · <time dateTime={f.createdAt}>{formatDateTime(f.createdAt)}</time></p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}
    </div>
  );
}
