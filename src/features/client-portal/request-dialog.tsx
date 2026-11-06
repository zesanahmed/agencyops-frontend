"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/features/organizations/org-context";
import { formatDateTime } from "@/lib/format";
import { REQUEST_STATUSES, type ClientRequest, type RequestStatus } from "@/types/domain";
import { useUpdateRequest } from "./hooks";
import { REQUEST_TYPE_LABEL, RequestStatusBadge, requestStatusLabel } from "./request-meta";

const MAX_NOTE = 5000;

/** One client request: read it, and (client-portal:manage) set its status and leave a resolution note the client can see. */
export function RequestDialog({ request, projectName, onClose }: { request: ClientRequest | null; projectName?: string; onClose: () => void }) {
  if (!request) return null;
  return <RequestDialogBody key={request.id} request={request} projectName={projectName} onClose={onClose} />;
}

function RequestDialogBody({ request, projectName, onClose }: { request: ClientRequest; projectName?: string; onClose: () => void }) {
  const { organizationId: o, can } = useOrg();
  const update = useUpdateRequest(o);
  const manage = can("client-portal:manage");
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [note, setNote] = useState(request.resolutionNote ?? "");
  const noteChanged = note.trim() !== (request.resolutionNote ?? "");
  const changed = status !== request.status || noteChanged;
  const tooLong = note.trim().length > MAX_NOTE;

  async function save() {
    try {
      await update.mutateAsync({
        id: request.id,
        ...(status !== request.status ? { status } : {}),
        // An emptied note is sent as null so the server clears it; unchanged notes are not re-sent.
        ...(noteChanged ? { resolutionNote: note.trim() || null } : {}),
      });
      onClose();
    } catch { /* toasted by the mutation; keep the dialog open */ }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader title={request.title} description={`${REQUEST_TYPE_LABEL[request.type]}${projectName ? ` · ${projectName}` : ""}`} />
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <RequestStatusBadge status={request.status} />
            {request.contact ? <span>From <span className="font-medium text-foreground">{request.contact.name}</span> ({request.contact.email})</span> : null}
            <span>· <time dateTime={request.createdAt}>{formatDateTime(request.createdAt)}</time></span>
          </div>
          <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-surface-muted p-3 text-sm">{request.description}</p>
          {projectName ? <Link href={`/organizations/${o}/projects/${request.projectId}?tab=client`} onClick={onClose} className="inline-block text-sm text-primary hover:underline">Open the project&apos;s client area</Link> : null}

          {manage ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="req-status">Status</Label>
                <Select id="req-status" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
                  {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{requestStatusLabel(s)}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-note">Resolution note <span className="font-normal text-muted-foreground">(shown to the client)</span></Label>
                <Textarea id="req-note" className="min-h-20" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={tooLong} />
                {tooLong ? <p className="text-xs text-danger">Note is too long (max {MAX_NOTE} characters)</p> : null}
              </div>
            </div>
          ) : request.resolutionNote ? <p className="border-t border-border pt-4 text-sm"><span className="font-medium">Resolution note: </span>{request.resolutionNote}</p> : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{manage ? "Cancel" : "Close"}</Button>
          {manage ? <Button disabled={!changed || tooLong} loading={update.isPending} onClick={save}>Save changes</Button> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
