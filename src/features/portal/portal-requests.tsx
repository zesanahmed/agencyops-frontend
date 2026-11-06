"use client";

import { useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { REQUEST_TYPE_LABEL, RequestStatusBadge } from "@/features/client-portal/request-meta";
import { useUrlState } from "@/hooks/use-url-state";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { formatDateTime } from "@/lib/format";
import { REQUEST_TYPES } from "@/types/domain";
import { useCreatePortalRequest, usePortalRequests } from "./hooks";

// Mirrors createClientRequestSchema: type enum, title 1–200, description 1–10000.
const schema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: z.string().trim().min(1, "Give your request a short title").max(200, "Title is too long"),
  description: z.string().trim().min(1, "Describe what you need").max(10000, "Description is too long"),
});
type Values = z.infer<typeof schema>;
const PAGE_SIZE = 10;

/** The contact's OWN requests for this project (the server never returns other people's), plus a form to raise a new one. */
export function PortalRequests({ projectId }: { projectId: string }) {
  const { page } = useUrlState();
  const q = usePortalRequests(projectId, { page, limit: PAGE_SIZE });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Questions, change requests or issues. Your agency sees them in their inbox and replies here.</p>
        <Button size="sm" onClick={() => setOpen(true)}><Plus /> New request</Button>
      </div>
      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading requests">{[0, 1].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load your requests" />
        : !q.data?.items.length ? <EmptyState icon={Inbox} title="No requests yet" description="Need a change, have a question or found an issue? Send a request and track its status here." action={<Button onClick={() => setOpen(true)}><Plus /> New request</Button>} />
        : (<>
          <ul className="space-y-3">
            {q.data.items.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><h3 className="font-medium leading-snug">{r.title}</h3><p className="text-xs text-muted-foreground">{REQUEST_TYPE_LABEL[r.type]} · <time dateTime={r.createdAt}>{formatDateTime(r.createdAt)}</time></p></div>
                  <RequestStatusBadge status={r.status} />
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.description}</p>
                {r.resolutionNote ? <p className="mt-3 rounded-md bg-surface-muted p-3 text-sm"><span className="font-medium">Reply from your agency: </span>{r.resolutionNote}</p> : null}
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}
      <NewRequestDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewRequestDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreatePortalRequest(projectId);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: "QUESTION", title: "", description: "" } });
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader title="New request" description="Tell your agency what you need. You'll see its status and their reply here." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
          try { await create.mutateAsync(v); reset(); onOpenChange(false); }
          catch (e) { for (const [k, message] of Object.entries(extractFieldErrors(e, ["type", "title", "description"] as const))) setError(k as keyof Values, { type: "server", message }); }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="req-type">Type</Label>
            <Select id="req-type" {...register("type")}>{REQUEST_TYPES.map((t) => <option key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</option>)}</Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="req-title">Title</Label><Input id="req-title" autoFocus aria-invalid={!!errors.title} {...register("title")} />{errors.title ? <p className="text-xs text-danger">{errors.title.message}</p> : null}</div>
          <div className="space-y-1.5"><Label htmlFor="req-desc">Details</Label><Textarea id="req-desc" className="min-h-28" aria-invalid={!!errors.description} {...register("description")} />{errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}</div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Send request</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
